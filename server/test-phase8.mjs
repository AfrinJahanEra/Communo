/* Live e2e test for Phase 8 (presence / online status). Run: node test-phase8.mjs */
import { io as ioc } from "socket.io-client";

const HOST = "http://localhost:5000";
const BASE = `${HOST}/api/v1`;

const api = async (method, path, token, body) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

const results = [];
const check = (name, cond, detail = "") =>
  results.push(`${cond ? "PASS" : "FAIL"} | ${name}${detail ? ` -- ${detail}` : ""}`);

const uniq = Date.now().toString(36);
const register = async (tag) => {
  const { status, data } = await api("POST", "/auth/register", null, {
    username: `p8${tag}_${uniq}`,
    email: `p8${tag}_${uniq}@mail.com`,
    password: "Passw0rd123",
  });
  if (status !== 201) throw new Error(`register ${tag} failed: ${status} ${JSON.stringify(data)}`);
  return { token: data.accessToken, id: data.user._id, username: data.user.username };
};

const connect = (token) =>
  new Promise((resolve, reject) => {
    const socket = ioc(HOST, { auth: { token }, transports: ["websocket"], reconnection: false });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (err) => reject(err));
    setTimeout(() => reject(new Error("connect timeout")), 5000);
  });

const emitAck = (socket, event, payload) =>
  new Promise((resolve) => {
    socket.emit(event, payload, resolve);
    setTimeout(() => resolve({ success: false, message: "ack timeout" }), 5000);
  });

const waitFor = (socket, event, ms = 4000) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

const A = await register("a");
const B = await register("b");
const C = await register("c");
const D = await register("d");

let r, evt;

// setup: A-B friends; server with A owner + C member
r = await api("POST", "/friends/requests", A.token, { userId: B.id });
const reqId = r.data.request?._id;
r = await api("POST", `/friends/requests/${reqId}/accept`, B.token);
check("setup: A-B friends", r.status === 200);

r = await api("POST", "/servers", A.token, { name: `P8 Presence ${uniq}`, isPublic: true });
const serverId = r.data.server?._id;
r = await api("POST", `/servers/${serverId}/join`, C.token);
check("setup: server + C joined", r.status === 200);

// ---------- offline baseline (nobody connected) ----------
r = await api("GET", "/friends/presence", A.token);
check("friends presence: B offline before any socket",
  r.status === 200 && r.data.presences?.length === 1 &&
  r.data.presences[0].status === "offline");

// ---------- going online ----------
const sockA = await connect(A.token);
r = await api("GET", "/friends/presence", B.token);
check("B sees A online via REST (B itself offline)",
  r.data.presences?.[0]?.username === A.username &&
  r.data.presences[0].status === "online" && r.data.presences[0].lastSeenAt === null);

evt = waitFor(sockA, "presence:update");
const sockB = await connect(B.token);
evt = await evt;
check("A receives presence:update when friend B connects",
  evt?.userId === B.id && evt?.status === "online");

// ---------- manual status ----------
evt = waitFor(sockA, "presence:update");
r = await emitAck(sockB, "presence:set", { status: "idle" });
evt = await evt;
check("B sets idle -> ack + live update to A",
  r.success && r.status === "idle" && evt?.userId === B.id && evt?.status === "idle");

r = await emitAck(sockB, "presence:set", { status: "busy" });
check("invalid status -> rejected", !r.success);

r = await api("GET", "/friends/presence", A.token);
check("REST reflects idle", r.data.presences?.[0]?.status === "idle");

// ---------- multi-device ----------
evt = waitFor(sockA, "presence:update", 1500);
const sockB2 = await connect(B.token);
check("second device -> no duplicate online broadcast", (await evt) === null);

evt = waitFor(sockA, "presence:update", 1500);
sockB2.disconnect();
check("closing one of two devices -> still no offline broadcast", (await evt) === null);
r = await api("GET", "/friends/presence", A.token);
check("B still idle with one device left", r.data.presences?.[0]?.status === "idle");

// ---------- going offline ----------
evt = waitFor(sockA, "presence:update");
sockB.disconnect();
evt = await evt;
check("last device closes -> offline + lastSeenAt broadcast",
  evt?.userId === B.id && evt?.status === "offline" && !!evt?.lastSeenAt);

r = await api("GET", "/friends/presence", A.token);
const seen = r.data.presences?.[0];
check("REST shows offline with recent lastSeenAt",
  seen?.status === "offline" && seen?.lastSeenAt &&
  Date.now() - new Date(seen.lastSeenAt).getTime() < 60_000);

// ---------- status resets on fresh session ----------
evt = waitFor(sockA, "presence:update");
const sockB3 = await connect(B.token);
evt = await evt;
check("reconnect starts a fresh 'online' session (idle not sticky)",
  evt?.userId === B.id && evt?.status === "online");

// dnd + own-device sync (broadcast includes the user's own room)
// drain B's own in-flight "online" self-broadcast from the reconnect above
await waitFor(sockB3, "presence:update", 1500);
const evtSelf = waitFor(sockB3, "presence:update");
evt = waitFor(sockA, "presence:update");
r = await emitAck(sockB3, "presence:set", { status: "dnd" });
check("dnd reaches friend live", r.success && (await evt)?.status === "dnd");
check("user's own devices get their presence change too",
  (await evtSelf)?.status === "dnd");

// ---------- server-wide presence ----------
r = await api("GET", `/servers/${serverId}/presence`, C.token);
check("member reads server presence -> 200 with all members",
  r.status === 200 && r.data.presences?.length === 2);
check("server presence: A online, C offline",
  r.data.presences?.find((p) => p.username === A.username)?.status === "online" &&
  r.data.presences?.find((p) => p.username === C.username)?.status === "offline");

r = await api("GET", `/servers/${serverId}/presence`, D.token);
check("non-member reads server presence -> 403", r.status === 403);

r = await api("GET", "/friends/presence", D.token);
check("no friends -> empty presence list", r.status === 200 && r.data.presences?.length === 0);

// ---------- cleanup ----------
sockA.disconnect();
sockB3.disconnect();
r = await api("DELETE", `/servers/${serverId}`, A.token);
check("server deleted", r.status === 200);

// ---------- report ----------
console.log("\n===== PHASE 8 TEST RESULTS =====");
for (const line of results) console.log(line);
const passed = results.filter((l) => l.startsWith("PASS")).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);

/* Live e2e test for Phase 6 (voice rooms + WebRTC signaling). Run: node test-phase6.mjs */
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
    username: `p6${tag}_${uniq}`,
    email: `p6${tag}_${uniq}@mail.com`,
    password: "Passw0rd123",
  });
  if (status !== 201) throw new Error(`register ${tag} failed: ${status} ${JSON.stringify(data)}`);
  return { token: data.accessToken, id: data.user._id };
};

// ---- socket helpers ----
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

const A = await register("a"); // owner
const B = await register("b"); // regular member
const C = await register("c"); // non-member

let r, serverId, generalId, voice1Id, voice2Id;

// ---------- setup ----------
r = await api("POST", "/servers", A.token, { name: `P6 Voice Lab ${uniq}`, isPublic: true });
serverId = r.data.server?._id;
check("server created", r.status === 201);

r = await api("GET", `/servers/${serverId}/channels`, A.token);
generalId = r.data.channels?.[0]?._id;
r = await api("POST", `/servers/${serverId}/join`, B.token);
check("B joined server", r.status === 200);

r = await api("POST", `/servers/${serverId}/channels`, A.token, { name: "study-room", type: "voice" });
voice1Id = r.data.channel?._id;
r = await api("POST", `/servers/${serverId}/channels`, A.token, {
  name: "solo-room",
  type: "voice",
  userLimit: 1,
});
voice2Id = r.data.channel?._id;
check("setup: voice channels created", !!generalId && !!voice1Id && !!voice2Id);

const sockA = await connect(A.token);
const sockB = await connect(B.token);
const sockC = await connect(C.token);
check("sockets connected (A, B, C)", sockA.connected && sockB.connected && sockC.connected);

// ---------- REST roster (empty) + guards ----------
r = await api("GET", `/channels/${voice1Id}/voice`, A.token);
check("GET voice roster (empty) -> 200 []", r.status === 200 && r.data.participants?.length === 0);

r = await api("GET", `/channels/${generalId}/voice`, A.token);
check("GET voice roster on text channel -> 400", r.status === 400);

r = await api("GET", `/channels/${voice1Id}/voice`, C.token);
check("non-member reads roster -> 403", r.status === 403);

// ---------- voice:join ----------
r = await emitAck(sockA, "voice:join", { channelId: voice1Id });
check("A joins voice -> ack with roster of 1",
  r.success && r.participants?.length === 1 && r.participants[0].userId === A.id);

r = await emitAck(sockA, "voice:join", { channelId: generalId });
check("join text channel via voice:join -> rejected", !r.success);

r = await emitAck(sockA, "voice:join", { channelId: "not-an-id" });
check("join with bad id -> rejected", !r.success);

r = await emitAck(sockC, "voice:join", { channelId: voice1Id });
check("non-member joins voice -> rejected", !r.success);

r = await emitAck(sockA, "voice:join", { channelId: voice1Id });
check("A joins same channel twice -> rejected", !r.success);

let evt = waitFor(sockA, "voice:user-joined");
r = await emitAck(sockB, "voice:join", { channelId: voice1Id });
check("B joins voice -> ack with roster of 2", r.success && r.participants?.length === 2);
evt = await evt;
check("A receives voice:user-joined for B",
  evt?.participant?.userId === B.id && evt?.participant?.username?.startsWith("p6b"));

r = await api("GET", `/channels/${voice1Id}/voice`, B.token);
check("REST roster shows 2, socketId not leaked",
  r.status === 200 && r.data.participants?.length === 2 &&
  r.data.participants.every((p) => p.socketId === undefined));

// ---------- WebRTC signaling relay ----------
evt = waitFor(sockA, "voice:signal");
r = await emitAck(sockB, "voice:signal", {
  targetUserId: A.id,
  data: { type: "offer", sdp: "fake-sdp-offer" },
});
check("B signals A -> ack ok", r.success);
evt = await evt;
check("A receives voice:signal from B with payload intact",
  evt?.fromUserId === B.id && evt?.data?.sdp === "fake-sdp-offer");

evt = waitFor(sockB, "voice:signal");
r = await emitAck(sockA, "voice:signal", {
  targetUserId: B.id,
  data: { type: "answer", sdp: "fake-sdp-answer" },
});
evt = await evt;
check("A answers B (reverse relay)", r.success && evt?.data?.type === "answer");

r = await emitAck(sockB, "voice:signal", { targetUserId: C.id, data: { type: "offer" } });
check("signal to user outside the room -> rejected", !r.success);

r = await emitAck(sockC, "voice:signal", { targetUserId: A.id, data: { type: "offer" } });
check("signal while not in voice -> rejected", !r.success);

// ---------- mute state ----------
evt = waitFor(sockA, "voice:state");
r = await emitAck(sockB, "voice:mute", { muted: true });
evt = await evt;
check("B mutes -> ack + A receives voice:state muted=true",
  r.success && r.muted === true && evt?.userId === B.id && evt?.muted === true);

r = await emitAck(sockB, "voice:mute", { muted: "yes" });
check("mute with non-boolean -> rejected", !r.success);

r = await api("GET", `/channels/${voice1Id}/voice`, A.token);
check("REST roster reflects B muted",
  r.data.participants?.find((p) => p.userId === B.id)?.muted === true);

evt = waitFor(sockA, "voice:state");
r = await emitAck(sockB, "voice:mute", { muted: false });
evt = await evt;
check("B unmutes -> broadcast muted=false", r.success && evt?.muted === false);

// ---------- userLimit + auto-switch ----------
evt = waitFor(sockA, "voice:user-left");
r = await emitAck(sockB, "voice:join", { channelId: voice2Id });
check("B switches to solo-room -> ack ok", r.success && r.participants?.length === 1);
evt = await evt;
check("A receives voice:user-left when B auto-switches", evt?.userId === B.id);

r = await emitAck(sockA, "voice:join", { channelId: voice2Id });
check("A joins full solo-room (userLimit 1) -> rejected", !r.success && /full/i.test(r.message || ""));

r = await api("GET", `/channels/${voice1Id}/voice`, A.token);
check("study-room roster back to 1 (A only)",
  r.data.participants?.length === 1 && r.data.participants[0].userId === A.id);

// ---------- voice:leave ----------
r = await emitAck(sockB, "voice:leave", {});
check("B leaves voice -> ack ok", r.success);

r = await emitAck(sockB, "voice:leave", {});
check("B leaves again -> rejected (not in voice)", !r.success);

r = await api("GET", `/channels/${voice2Id}/voice`, A.token);
check("solo-room roster empty after leave", r.data.participants?.length === 0);

// ---------- disconnect cleanup ----------
evt = waitFor(sockA, "voice:user-joined");
await emitAck(sockB, "voice:join", { channelId: voice1Id });
await evt; // B is back in study-room with A

evt = waitFor(sockA, "voice:user-left");
sockB.disconnect();
evt = await evt;
check("A receives voice:user-left on B disconnect", evt?.userId === B.id);

r = await api("GET", `/channels/${voice1Id}/voice`, A.token);
check("roster cleaned after disconnect", r.data.participants?.length === 1);

// ---------- CONNECT_VOICE permission gating ----------
r = await api("GET", `/servers/${serverId}/roles`, A.token);
const everyone = r.data.roles?.find((role) => role.name === "@everyone" || role.isDefault);
check("found @everyone role", !!everyone);
const originalPerms = everyone.permissions;

r = await api("PATCH", `/servers/${serverId}/roles/${everyone._id}`, A.token, {
  permissions: originalPerms & ~(1 << 10), // strip CONNECT_VOICE
});
check("revoke CONNECT_VOICE on @everyone -> 200", r.status === 200);

const sockB2 = await connect(B.token);
r = await emitAck(sockB2, "voice:join", { channelId: voice1Id });
check("B joins voice without CONNECT_VOICE -> rejected", !r.success && /permission/i.test(r.message || ""));

r = await emitAck(sockA, "voice:mute", { muted: true });
check("owner unaffected by revoke (ADMIN bypass)", r.success);

r = await api("PATCH", `/servers/${serverId}/roles/${everyone._id}`, A.token, {
  permissions: originalPerms,
});
check("restore @everyone permissions -> 200", r.status === 200);

r = await emitAck(sockB2, "voice:join", { channelId: voice1Id });
check("B joins voice after restore -> ack ok", r.success);

// ---------- cleanup ----------
sockA.disconnect();
sockB2.disconnect();
sockC.disconnect();
r = await api("DELETE", `/servers/${serverId}`, A.token);
check("server deleted", r.status === 200);

// ---------- report ----------
console.log("\n===== PHASE 6 TEST RESULTS =====");
for (const line of results) console.log(line);
const passed = results.filter((l) => l.startsWith("PASS")).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);

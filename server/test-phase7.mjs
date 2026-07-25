/* Live e2e test for Phase 7 (friends + DMs). Run: node test-phase7.mjs */
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
    username: `p7${tag}_${uniq}`,
    email: `p7${tag}_${uniq}@mail.com`,
    password: "Passw0rd123",
  });
  if (status !== 201) throw new Error(`register ${tag} failed: ${status} ${JSON.stringify(data)}`);
  return { token: data.accessToken, id: data.user._id, username: data.user.username };
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

const A = await register("a");
const B = await register("b");
const C = await register("c");
const D = await register("d");

const sockA = await connect(A.token);
const sockB = await connect(B.token);
const sockC = await connect(C.token);
check("sockets connected (A, B, C)", sockA.connected && sockB.connected && sockC.connected);

let r, evt;

// ---------- friend requests ----------
evt = waitFor(sockB, "friend:request");
r = await api("POST", "/friends/requests", A.token, { username: B.username });
check("A requests B by username -> 201 pending",
  r.status === 201 && r.data.request?.status === "pending");
evt = await evt;
check("B receives friend:request live (no room join needed)",
  evt?.requester?.username === A.username && !!evt?.requestId);

r = await api("POST", "/friends/requests", A.token, { username: B.username });
check("duplicate request -> 409", r.status === 409);

r = await api("POST", "/friends/requests", A.token, { username: A.username });
check("self request -> 400", r.status === 400);

r = await api("POST", "/friends/requests", A.token, { username: `ghost_${uniq}` });
check("request to unknown user -> 404", r.status === 404);

r = await api("POST", "/friends/requests", A.token, {});
check("request without userId/username -> 400", r.status === 400);

// reverse request auto-accepts
evt = waitFor(sockA, "friend:accepted");
r = await api("POST", "/friends/requests", B.token, { userId: A.id });
check("B requests A back -> auto-accepted (200)",
  r.status === 200 && r.data.request?.status === "accepted");
evt = await evt;
check("A receives friend:accepted live", evt?.friend?.username === B.username);

r = await api("GET", "/friends", A.token);
check("A friends list contains B",
  r.status === 200 && r.data.friends?.some((f) => f.user.username === B.username));

r = await api("POST", "/friends/requests", A.token, { userId: B.id });
check("request when already friends -> 409", r.status === 409);

// incoming/outgoing lists + decline + cancel
r = await api("POST", "/friends/requests", A.token, { userId: C.id });
check("A requests C -> 201", r.status === 201);
const reqAC = r.data.request?._id;

r = await api("GET", "/friends/requests", C.token);
check("C sees incoming request from A",
  r.data.incoming?.length === 1 && r.data.incoming[0].requesterId?.username === A.username);
r = await api("GET", "/friends/requests", A.token);
check("A sees outgoing request to C", r.data.outgoing?.length === 1);

r = await api("DELETE", `/friends/requests/${reqAC}`, C.token);
check("C declines request -> 200", r.status === 200);

r = await api("POST", "/friends/requests", A.token, { userId: C.id });
const reqAC2 = r.data.request?._id;
r = await api("DELETE", `/friends/requests/${reqAC2}`, A.token);
check("A cancels own request -> 200", r.status === 200);
r = await api("GET", "/friends/requests", C.token);
check("C incoming empty after cancel", r.data.incoming?.length === 0);

// explicit accept flow: C -> A
r = await api("POST", "/friends/requests", C.token, { userId: A.id });
const reqCA = r.data.request?._id;
r = await api("POST", `/friends/requests/${reqCA}/accept`, B.token);
check("outsider accepts someone else's request -> 403", r.status === 403);

evt = waitFor(sockC, "friend:accepted");
r = await api("POST", `/friends/requests/${reqCA}/accept`, A.token);
check("A accepts C's request -> 200", r.status === 200 && r.data.request?.status === "accepted");
evt = await evt;
check("C receives friend:accepted live", evt?.friend?.username === A.username);

r = await api("POST", `/friends/requests/${reqCA}/accept`, A.token);
check("accept already-handled request -> 404", r.status === 404);

// D <-> B friendship (for the block tests)
r = await api("POST", "/friends/requests", D.token, { userId: B.id });
const reqDB = r.data.request?._id;
r = await api("POST", `/friends/requests/${reqDB}/accept`, B.token);
check("B accepts D -> friends", r.status === 200);

// ---------- remove friend ----------
evt = waitFor(sockB, "friend:removed");
r = await api("DELETE", `/friends/${B.id}`, A.token);
check("A removes friend B -> 200", r.status === 200);
evt = await evt;
check("B receives friend:removed live", evt?.userId === A.id);

r = await api("DELETE", `/friends/${B.id}`, A.token);
check("remove non-friend -> 404", r.status === 404);

// ---------- blocks ----------
r = await api("POST", "/friends/blocks", D.token, { userId: B.id });
check("D blocks B -> 201", r.status === 201);

r = await api("GET", "/friends", B.token);
check("block severed the D-B friendship",
  r.status === 200 && !r.data.friends?.some((f) => f.user.username === D.username));

r = await api("POST", "/friends/requests", B.token, { userId: D.id });
check("blocked user requests blocker -> 403", r.status === 403);
r = await api("POST", "/friends/requests", D.token, { userId: B.id });
check("blocker requests blocked -> 403 (either direction)", r.status === 403);

r = await api("POST", "/friends/blocks", D.token, { userId: B.id });
check("block twice -> 409", r.status === 409);
r = await api("POST", "/friends/blocks", D.token, { userId: D.id });
check("block self -> 400", r.status === 400);

r = await api("GET", "/friends/blocks", D.token);
check("D's block list contains B",
  r.status === 200 && r.data.blocks?.some((b) => b.user.username === B.username));

r = await api("DELETE", `/friends/blocks/${B.id}`, D.token);
check("D unblocks B -> 200", r.status === 200);
r = await api("DELETE", `/friends/blocks/${B.id}`, D.token);
check("unblock again -> 404", r.status === 404);

r = await api("POST", "/friends/requests", B.token, { userId: D.id });
check("request works again after unblock -> 201", r.status === 201);

// ---------- DMs ----------
r = await api("POST", "/dms", A.token, { userId: C.id });
const dmId = r.data.dm?._id;
check("A opens DM with friend C -> 201, 2 participants",
  r.status === 201 && r.data.dm?.participantIds?.length === 2);

r = await api("POST", "/dms", A.token, { userId: C.id });
check("open again -> 200 same conversation (idempotent)",
  r.status === 200 && r.data.dm?._id === dmId);

r = await api("GET", "/dms", C.token);
check("C's DM list shows the conversation with A",
  r.status === 200 && r.data.dms?.length === 1 &&
  r.data.dms[0].participantIds.some((p) => p.username === A.username));

r = await api("POST", "/dms", A.token, { userId: B.id });
check("DM a non-friend -> 403", r.status === 403);
r = await api("POST", "/dms", A.token, { userId: A.id });
check("DM yourself -> 400", r.status === 400);

r = await api("GET", `/dms/${dmId}/messages`, B.token);
check("non-participant reads DM -> 403", r.status === 403);

// REST send -> both user rooms get dm:new (C never joined anything)
evt = waitFor(sockC, "dm:new");
const evtSelf = waitFor(sockA, "dm:new");
r = await api("POST", `/dms/${dmId}/messages`, A.token, { content: "hey C!" });
const msgA1 = r.data.message;
check("A sends DM -> 201 + author populated",
  r.status === 201 && msgA1?.authorId?.username === A.username);
evt = await evt;
check("C receives dm:new live in personal room", evt?.message?.content === "hey C!");
check("A's own devices also receive dm:new", (await evtSelf)?.message?._id === msgA1?._id);

r = await api("POST", `/dms/${dmId}/messages`, A.token, { content: "" });
check("empty DM content -> 400", r.status === 400);

// socket send path
evt = waitFor(sockA, "dm:new");
r = await emitAck(sockC, "dm:send", { dmId, content: "hi A, from socket" });
check("C sends via socket dm:send -> ack ok", r.success && !!r.message?._id);
evt = await evt;
check("A receives C's socket message live", evt?.message?.content === "hi A, from socket");

r = await emitAck(sockB, "dm:send", { dmId, content: "intruder" });
check("non-participant dm:send -> rejected", !r.success);

// history + cursor pagination
for (let i = 1; i <= 5; i++) {
  await api("POST", `/dms/${dmId}/messages`, C.token, { content: `dm ${i}` });
}
r = await api("GET", `/dms/${dmId}/messages?limit=3`, A.token);
check("history newest-first with nextCursor",
  r.status === 200 && r.data.messages?.length === 3 &&
  r.data.messages[0].content === "dm 5" && !!r.data.nextCursor);

const page2 = await api("GET", `/dms/${dmId}/messages?limit=3&before=${r.data.nextCursor}`, A.token);
check("cursor page 2 has no overlap",
  page2.status === 200 &&
  !page2.data.messages.some((m) => r.data.messages.some((x) => x._id === m._id)));

r = await api("GET", `/dms/${dmId}/messages?before=${msgA1._id.replace(/./g, "a")}`, A.token);
check("invalid cursor -> 400", r.status === 400);

// edit / delete (author only)
evt = waitFor(sockC, "dm:updated");
r = await api("PATCH", `/dms/messages/${msgA1._id}`, A.token, { content: "hey C! (edited)" });
check("author edits DM message -> 200 + editedAt",
  r.status === 200 && r.data.message?.editedAt !== null);
evt = await evt;
check("C receives dm:updated live", evt?.message?.content === "hey C! (edited)");

r = await api("PATCH", `/dms/messages/${msgA1._id}`, C.token, { content: "hacked" });
check("non-author edits -> 403", r.status === 403);
r = await api("DELETE", `/dms/messages/${msgA1._id}`, C.token);
check("non-author deletes -> 403", r.status === 403);

evt = waitFor(sockC, "dm:deleted");
r = await api("DELETE", `/dms/messages/${msgA1._id}`, A.token);
check("author deletes own DM message -> 200", r.status === 200);
evt = await evt;
check("C receives dm:deleted live", evt?.messageId === msgA1._id);

// typing indicator
evt = waitFor(sockC, "dm:typing");
r = await emitAck(sockA, "dm:typing", { dmId, isTyping: true });
evt = await evt;
check("C sees A typing in DM",
  r.success && evt?.username === A.username && evt?.isTyping === true);

r = await emitAck(sockB, "dm:typing", { dmId, isTyping: true });
check("non-participant dm:typing -> rejected", !r.success);

// blocks cut off existing conversations
r = await api("POST", "/friends/blocks", C.token, { userId: A.id });
check("C blocks A -> 201", r.status === 201);
r = await api("POST", `/dms/${dmId}/messages`, A.token, { content: "still there?" });
check("A sends DM while blocked -> 403", r.status === 403);
r = await api("DELETE", `/friends/blocks/${A.id}`, C.token);
check("C unblocks A -> 200", r.status === 200);
r = await api("POST", `/dms/${dmId}/messages`, A.token, { content: "we are back" });
check("DM works again after unblock -> 201", r.status === 201);

// ---------- cleanup ----------
sockA.disconnect();
sockB.disconnect();
sockC.disconnect();

// ---------- report ----------
console.log("\n===== PHASE 7 TEST RESULTS =====");
for (const line of results) console.log(line);
const passed = results.filter((l) => l.startsWith("PASS")).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);

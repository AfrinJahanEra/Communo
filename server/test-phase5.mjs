/* Live e2e test for Phase 5 (messaging + Socket.IO). Run: node test-phase5.mjs */
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
    username: `p5${tag}_${uniq}`,
    email: `p5${tag}_${uniq}@mail.com`,
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

let r, serverId, generalId, annId, voiceId, privateId, threadId;

// ---------- setup ----------
r = await api("POST", "/servers", A.token, { name: `P5 Lab ${uniq}`, isPublic: true });
serverId = r.data.server?._id;
check("server created", r.status === 201);

r = await api("GET", `/servers/${serverId}/channels`, A.token);
generalId = r.data.channels?.[0]?._id;
r = await api("POST", `/servers/${serverId}/join`, B.token);
check("B joined server", r.status === 200);

r = await api("POST", `/servers/${serverId}/channels`, A.token, { name: "news", type: "announcement" });
annId = r.data.channel?._id;
r = await api("POST", `/servers/${serverId}/channels`, A.token, { name: "study-voice", type: "voice" });
voiceId = r.data.channel?._id;
r = await api("POST", `/servers/${serverId}/channels`, A.token, { name: "staff", isPrivate: true });
privateId = r.data.channel?._id;
r = await api("POST", `/channels/${generalId}/threads`, A.token, { name: "Algo help" });
threadId = r.data.thread?._id;
check("setup: channels + thread", !!annId && !!voiceId && !!privateId && !!threadId);

// ---------- REST: create messages ----------
r = await api("POST", `/channels/${generalId}/messages`, B.token, { content: "hello world" });
const msgB1 = r.data.message;
check("B sends channel message -> 201 + author populated",
  r.status === 201 && msgB1?.content === "hello world" &&
  msgB1?.authorId?.username?.startsWith("p5b"));

r = await api("POST", `/channels/${generalId}/messages`, B.token, { content: "" });
check("empty content -> 400", r.status === 400);

r = await api("POST", `/channels/${generalId}/messages`, B.token, { content: "x".repeat(2001) });
check("content > 2000 chars -> 400", r.status === 400);

r = await api("POST", `/channels/${generalId}/messages`, C.token, { content: "intruder" });
check("non-member sends message -> 403", r.status === 403);

r = await api("POST", `/channels/${voiceId}/messages`, A.token, { content: "nope" });
check("message in voice channel -> 400", r.status === 400);

r = await api("POST", `/channels/${annId}/messages`, B.token, { content: "nope" });
check("B posts in announcement -> 403 (needs MANAGE_MESSAGES)", r.status === 403);

r = await api("POST", `/channels/${annId}/messages`, A.token, { content: "Welcome week!" });
check("owner posts in announcement -> 201", r.status === 201);

r = await api("POST", `/channels/${privateId}/messages`, A.token, { content: "secret" });
check("owner posts in private channel -> 201", r.status === 201);

r = await api("GET", `/channels/${privateId}/messages`, B.token);
check("B reads private channel messages -> 403", r.status === 403);

// ---------- REST: history + cursor pagination ----------
for (let i = 1; i <= 5; i++) {
  await api("POST", `/channels/${generalId}/messages`, A.token, { content: `msg ${i}` });
}
r = await api("GET", `/channels/${generalId}/messages?limit=3`, B.token);
check("history limit=3 -> 3 newest first + nextCursor",
  r.status === 200 && r.data.messages?.length === 3 &&
  r.data.messages[0].content === "msg 5" && !!r.data.nextCursor);

const cursor = r.data.nextCursor;
const firstPageIds = r.data.messages.map((m) => m._id);
r = await api("GET", `/channels/${generalId}/messages?limit=3&before=${cursor}`, B.token);
check("cursor page -> older messages, no overlap",
  r.status === 200 && r.data.messages?.length === 3 &&
  r.data.messages.every((m) => !firstPageIds.includes(m._id)) &&
  r.data.messages[0].content === "msg 2");

r = await api("GET", `/channels/${generalId}/messages?before=aaaaaaaaaaaaaaaaaaaaaaaa`, B.token);
check("unknown cursor -> 400", r.status === 400);

r = await api("GET", `/channels/${generalId}/messages`, C.token);
check("non-member reads history -> 403", r.status === 403);

// ---------- REST: thread messages ----------
r = await api("POST", `/threads/${threadId}/messages`, B.token, { content: "thread reply" });
check("B posts thread message -> 201 + threadId set",
  r.status === 201 && r.data.message?.threadId === threadId);

r = await api("GET", `/threads/${threadId}`, A.token);
check("posting made B a thread participant",
  r.status === 200 && r.data.thread?.participantIds?.some((id) => id === B.id));

r = await api("GET", `/threads/${threadId}/messages`, A.token);
check("thread history -> 200 + isolated from channel history",
  r.status === 200 && r.data.messages?.length === 1);

r = await api("GET", `/channels/${generalId}/messages?limit=100`, A.token);
check("channel history excludes thread messages",
  r.status === 200 && r.data.messages?.every((m) => m.threadId === null));

// archived thread is read-only
r = await api("POST", `/channels/${generalId}/threads`, A.token, { name: "to archive" });
const archThreadId = r.data.thread?._id;
await api("POST", `/threads/${archThreadId}/archive`, A.token);
r = await api("POST", `/threads/${archThreadId}/messages`, A.token, { content: "zombie" });
check("post in archived thread -> 400", r.status === 400);

// locked thread: only MANAGE_THREADS can post
r = await api("POST", `/channels/${generalId}/threads`, A.token, { name: "to lock" });
const lockThreadId = r.data.thread?._id;
await api("POST", `/threads/${lockThreadId}/lock`, A.token);
r = await api("POST", `/threads/${lockThreadId}/messages`, B.token, { content: "nope" });
check("B posts in locked thread -> 403", r.status === 403);
r = await api("POST", `/threads/${lockThreadId}/messages`, A.token, { content: "mod note" });
check("manager posts in locked thread -> 201", r.status === 201);

// ---------- REST: edit / delete ----------
r = await api("PATCH", `/messages/${msgB1._id}`, B.token, { content: "hello world (edited)" });
check("author edits own message -> 200 + editedAt",
  r.status === 200 && r.data.message?.content === "hello world (edited)" &&
  !!r.data.message?.editedAt);

r = await api("PATCH", `/messages/${msgB1._id}`, A.token, { content: "hijack" });
check("even owner cannot edit others' messages -> 403", r.status === 403);

r = await api("POST", `/channels/${generalId}/messages`, A.token, { content: "A's msg" });
const msgA1 = r.data.message;
r = await api("DELETE", `/messages/${msgA1._id}`, B.token);
check("B deletes A's message -> 403", r.status === 403);

r = await api("POST", `/channels/${generalId}/messages`, B.token, { content: "delete me" });
const msgB2 = r.data.message;
r = await api("DELETE", `/messages/${msgB2._id}`, B.token);
check("author deletes own message -> 200", r.status === 200);

r = await api("POST", `/channels/${generalId}/messages`, B.token, { content: "mod delete me" });
const msgB3 = r.data.message;
r = await api("DELETE", `/messages/${msgB3._id}`, A.token);
check("MANAGE_MESSAGES deletes any message -> 200", r.status === 200);

r = await api("PATCH", `/messages/${msgB3._id}`, B.token, { content: "ghost" });
check("deleted message -> 404", r.status === 404);

// ---------- REST: pins ----------
r = await api("POST", `/messages/${msgB1._id}/pin`, B.token);
check("pin without MANAGE_MESSAGES -> 403", r.status === 403);

r = await api("POST", `/messages/${msgB1._id}/pin`, A.token);
check("owner pins -> 200 + pinned", r.status === 200 && r.data.message?.pinned === true);

r = await api("POST", `/messages/${msgB1._id}/pin`, A.token);
check("pin twice -> 400", r.status === 400);

r = await api("GET", `/channels/${generalId}/pins`, B.token);
check("channel pins list -> 1", r.status === 200 && r.data.messages?.length === 1);

r = await api("DELETE", `/messages/${msgB1._id}/pin`, A.token);
check("unpin -> 200", r.status === 200 && r.data.message?.pinned === false);

// ---------- Socket.IO ----------
let sockA, sockB, sockC;

try {
  await connect("not-a-token");
  check("socket connect with bad token rejected", false);
} catch {
  check("socket connect with bad token rejected", true);
}

try {
  sockA = await connect(A.token);
  sockB = await connect(B.token);
  sockC = await connect(C.token);
  check("sockets connected with valid JWTs", true);
} catch (e) {
  check("sockets connected with valid JWTs", false, e.message);
}

let ack = await emitAck(sockA, "channel:join", { channelId: generalId });
check("A joins #general room", ack.success === true);
ack = await emitAck(sockB, "channel:join", { channelId: generalId });
check("B joins #general room", ack.success === true);

ack = await emitAck(sockC, "channel:join", { channelId: generalId });
check("non-member socket join -> rejected", ack.success === false);

ack = await emitAck(sockB, "channel:join", { channelId: privateId });
check("B joins private channel room -> rejected", ack.success === false);

// REST create -> both sockets receive message:new
let evA = waitFor(sockA, "message:new");
r = await api("POST", `/channels/${generalId}/messages`, B.token, { content: "realtime via REST" });
let ev = await evA;
check("REST message broadcast as message:new",
  ev?.message?.content === "realtime via REST" && ev?.message?.authorId?.username?.startsWith("p5b"));

// socket message:send -> ack + broadcast
evA = waitFor(sockA, "message:new");
ack = await emitAck(sockB, "message:send", { channelId: generalId, content: "realtime via socket" });
ev = await evA;
check("socket message:send -> ack with message", ack.success === true && !!ack.message?._id);
check("socket message received by room", ev?.message?.content === "realtime via socket");

ack = await emitAck(sockC, "message:send", { channelId: generalId, content: "intruder rt" });
check("non-member socket message:send -> rejected", ack.success === false);

// typing indicators
evA = waitFor(sockA, "typing");
ack = await emitAck(sockB, "typing:start", { channelId: generalId });
ev = await evA;
check("typing:start broadcast to room",
  ack.success === true && ev?.isTyping === true && ev?.username?.startsWith("p5b"));

evA = waitFor(sockA, "typing");
await emitAck(sockB, "typing:stop", { channelId: generalId });
ev = await evA;
check("typing:stop broadcast to room", ev?.isTyping === false);

ack = await emitAck(sockC, "typing:start", { channelId: generalId });
check("typing without joining room -> rejected", ack.success === false);

// live edit / delete / pin events
r = await api("POST", `/channels/${generalId}/messages`, B.token, { content: "watch me change" });
const liveMsg = r.data.message;

evA = waitFor(sockA, "message:updated");
await api("PATCH", `/messages/${liveMsg._id}`, B.token, { content: "changed live" });
ev = await evA;
check("message:updated event received", ev?.message?.content === "changed live");

evA = waitFor(sockA, "message:pinned");
await api("POST", `/messages/${liveMsg._id}/pin`, A.token);
ev = await evA;
check("message:pinned event received", ev?.message?.pinned === true);

evA = waitFor(sockA, "message:deleted");
await api("DELETE", `/messages/${liveMsg._id}`, A.token);
ev = await evA;
check("message:deleted event received", ev?.messageId === liveMsg._id);

// thread rooms
ack = await emitAck(sockA, "thread:join", { threadId });
check("A joins thread room", ack.success === true);

const evThread = waitFor(sockA, "message:new");
ack = await emitAck(sockB, "message:send", { threadId, content: "thread realtime" });
ev = await evThread;
check("thread message via socket -> broadcast to thread room",
  ack.success === true && ev?.message?.threadId === threadId &&
  ev?.message?.content === "thread realtime");

ack = await emitAck(sockC, "thread:join", { threadId });
check("non-member thread:join -> rejected", ack.success === false);

sockA.disconnect();
sockB.disconnect();
sockC.disconnect();

// ---------- cascades ----------
r = await api("DELETE", `/threads/${threadId}`, A.token);
check("thread deleted", r.status === 200);

r = await api("POST", `/servers/${serverId}/channels`, A.token, { name: "temp" });
const tempId = r.data.channel?._id;
r = await api("POST", `/channels/${tempId}/messages`, A.token, { content: "doomed" });
const doomedMsg = r.data.message;
r = await api("DELETE", `/channels/${tempId}`, A.token);
check("channel deleted", r.status === 200);
r = await api("PATCH", `/messages/${doomedMsg._id}`, A.token, { content: "?" });
check("channel delete cascades messages -> 404", r.status === 404);

r = await api("DELETE", `/servers/${serverId}`, A.token);
check("server deleted", r.status === 200);
r = await api("PATCH", `/messages/${msgB1._id}`, B.token, { content: "?" });
check("server delete cascades messages -> 404", r.status === 404);

// ---------- report ----------
const passed = results.filter((l) => l.startsWith("PASS")).length;
console.log(results.join("\n"));
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);

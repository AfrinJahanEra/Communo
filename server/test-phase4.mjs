/* Live e2e test for Phase 4 (threads). Run: node test-phase4.mjs */
const BASE = "http://localhost:5000/api/v1";

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
    username: `p4${tag}_${uniq}`,
    email: `p4${tag}_${uniq}@mail.com`,
    password: "Passw0rd123",
  });
  if (status !== 201) throw new Error(`register ${tag} failed: ${status} ${JSON.stringify(data)}`);
  return { token: data.accessToken, id: data.user._id };
};

const A = await register("a"); // owner
const B = await register("b"); // regular member
const C = await register("c"); // non-member

let r, serverId, generalId, voiceId, annId, privateId;
let tB, tA, tPrivate; // thread ids

// ---------- setup ----------
r = await api("POST", "/servers", A.token, { name: `P4 Lab ${uniq}`, isPublic: true });
serverId = r.data.server?._id;
check("server created", r.status === 201);

r = await api("GET", `/servers/${serverId}/channels`, A.token);
generalId = r.data.channels?.[0]?._id;
check("got #general", !!generalId);

r = await api("POST", `/servers/${serverId}/join`, B.token);
check("B joined server", r.status === 200);

r = await api("POST", `/servers/${serverId}/channels`, A.token, { name: "standup", type: "voice" });
voiceId = r.data.channel?._id;
r = await api("POST", `/servers/${serverId}/channels`, A.token, { name: "news", type: "announcement" });
annId = r.data.channel?._id;
r = await api("POST", `/servers/${serverId}/channels`, A.token, { name: "staff", isPrivate: true });
privateId = r.data.channel?._id;
check("setup channels created", !!voiceId && !!annId && !!privateId);

// ---------- create ----------
r = await api("POST", `/channels/${generalId}/threads`, B.token, { name: "DP homework help" });
tB = r.data.thread?._id;
check("B creates thread -> 201 + creator is participant",
  r.status === 201 && r.data.thread?.participantIds?.length === 1 &&
  r.data.thread?.participantIds[0] === B.id && r.data.thread?.channelId === generalId);

r = await api("POST", `/channels/${generalId}/threads`, A.token, { name: "Exam prep" });
tA = r.data.thread?._id;
check("A creates thread -> 201", r.status === 201);

r = await api("POST", `/channels/${generalId}/threads`, C.token, { name: "intruder" });
check("non-member creates thread -> 403", r.status === 403);

r = await api("POST", `/channels/${generalId}/threads`, A.token, { name: "" });
check("empty thread name -> 400", r.status === 400);

r = await api("POST", `/channels/${voiceId}/threads`, A.token, { name: "nope" });
check("thread in voice channel -> 400", r.status === 400);

r = await api("POST", `/channels/${annId}/threads`, B.token, { name: "nope" });
check("B thread in announcement channel -> 403 (needs MANAGE_THREADS)", r.status === 403);

r = await api("POST", `/channels/${annId}/threads`, A.token, { name: "Week 1 digest" });
check("owner thread in announcement channel -> 201", r.status === 201);

r = await api("POST", `/channels/${privateId}/threads`, A.token, { name: "grades" });
tPrivate = r.data.thread?._id;
check("owner thread in private channel -> 201", r.status === 201);

// ---------- list ----------
r = await api("GET", `/channels/${generalId}/threads`, B.token);
check("list active threads -> 2", r.status === 200 && r.data.threads?.length === 2);

r = await api("GET", `/channels/${generalId}/threads?archived=true`, B.token);
check("list archived -> 0", r.status === 200 && r.data.threads?.length === 0);

r = await api("GET", `/channels/${generalId}/threads`, C.token);
check("non-member lists threads -> 403", r.status === 403);

// ---------- get / access ----------
r = await api("GET", `/threads/${tB}`, A.token);
check("get thread -> 200", r.status === 200 && r.data.thread?.name === "DP homework help");

r = await api("GET", `/threads/${tB}`, C.token);
check("non-member gets thread -> 403", r.status === 403);

r = await api("GET", `/threads/${tPrivate}`, B.token);
check("B gets thread in private channel -> 403", r.status === 403);

r = await api("GET", `/channels/${privateId}/threads`, B.token);
check("B lists threads of private channel -> 403", r.status === 403);

r = await api("GET", `/threads/not-an-id`, A.token);
check("malformed thread id -> 400", r.status === 400);

r = await api("GET", `/threads/aaaaaaaaaaaaaaaaaaaaaaaa`, A.token);
check("unknown thread id -> 404", r.status === 404);

// ---------- rename ----------
r = await api("PATCH", `/threads/${tB}`, B.token, { name: "DP homework help v2" });
check("creator renames own thread -> 200", r.status === 200 && r.data.thread?.name === "DP homework help v2");

r = await api("PATCH", `/threads/${tA}`, B.token, { name: "hijack" });
check("B renames A's thread -> 403", r.status === 403);

r = await api("PATCH", `/threads/${tB}`, A.token, { name: "DP homework help v3" });
check("owner (MANAGE_THREADS) renames B's thread -> 200", r.status === 200);

r = await api("PATCH", `/threads/${tB}`, B.token, {});
check("empty update body -> 400", r.status === 400);

// ---------- join / leave ----------
r = await api("POST", `/threads/${tA}/join`, B.token);
check("B joins A's thread -> 200 + 2 participants",
  r.status === 200 && r.data.thread?.participantIds?.length === 2);

r = await api("POST", `/threads/${tA}/join`, B.token);
check("join twice -> 409", r.status === 409);

r = await api("POST", `/threads/${tA}/leave`, B.token);
check("B leaves thread -> 200 + 1 participant",
  r.status === 200 && r.data.thread?.participantIds?.length === 1);

r = await api("POST", `/threads/${tA}/leave`, B.token);
check("leave when not participant -> 400", r.status === 400);

// ---------- archive ----------
r = await api("POST", `/threads/${tA}/archive`, B.token);
check("B archives A's thread -> 403", r.status === 403);

r = await api("POST", `/threads/${tB}/archive`, B.token);
check("creator archives own thread -> 200", r.status === 200 && r.data.thread?.archived === true);

r = await api("POST", `/threads/${tB}/archive`, B.token);
check("archive twice -> 400", r.status === 400);

r = await api("PATCH", `/threads/${tB}`, B.token, { name: "zombie edit" });
check("edit archived thread -> 400", r.status === 400);

r = await api("POST", `/threads/${tB}/join`, A.token);
check("join archived thread -> 400", r.status === 400);

r = await api("GET", `/channels/${generalId}/threads`, A.token);
check("archived thread hidden from active list", r.status === 200 && r.data.threads?.length === 1);

r = await api("GET", `/channels/${generalId}/threads?archived=true`, A.token);
check("archived thread shows in archived list",
  r.status === 200 && r.data.threads?.length === 1 && r.data.threads[0]._id === tB);

r = await api("POST", `/threads/${tB}/unarchive`, B.token);
check("creator unarchives -> 200", r.status === 200 && r.data.thread?.archived === false);

// ---------- lock ----------
r = await api("POST", `/threads/${tB}/lock`, B.token);
check("B locks own thread -> 403 (MANAGE_THREADS only)", r.status === 403);

r = await api("POST", `/threads/${tB}/lock`, A.token);
check("owner locks thread -> 200", r.status === 200 && r.data.thread?.locked === true);

r = await api("PATCH", `/threads/${tB}`, B.token, { name: "locked edit" });
check("creator edits locked thread -> 403", r.status === 403);

r = await api("POST", `/threads/${tB}/archive`, B.token);
check("creator archives locked thread -> 403", r.status === 403);

r = await api("POST", `/threads/${tB}/join`, A.token);
check("join locked thread -> 400", r.status === 400);

r = await api("PATCH", `/threads/${tB}`, A.token, { name: "mod edit ok" });
check("manager edits locked thread -> 200", r.status === 200);

// ---------- MANAGE_THREADS via role bitfield ----------
const MANAGE_THREADS = 1 << 9;
r = await api("POST", `/servers/${serverId}/roles`, A.token, { name: "TA", permissions: MANAGE_THREADS });
const taRoleId = r.data.role?._id;
check("TA role created with MANAGE_THREADS", r.status === 201 && !!taRoleId);

r = await api("PUT", `/servers/${serverId}/members/${B.id}/roles`, A.token, { roleIds: [taRoleId] });
check("B assigned TA role", r.status === 200);

r = await api("POST", `/threads/${tB}/unlock`, B.token);
check("B (TA) unlocks thread -> 200", r.status === 200 && r.data.thread?.locked === false);

r = await api("POST", `/channels/${annId}/threads`, B.token, { name: "TA digest" });
check("B (TA) creates announcement thread -> 201", r.status === 201);

r = await api("PUT", `/servers/${serverId}/members/${B.id}/roles`, A.token, { roleIds: [] });
check("TA role removed from B", r.status === 200);

r = await api("POST", `/threads/${tB}/lock`, B.token);
check("B without TA locks -> 403 again", r.status === 403);

// ---------- delete ----------
r = await api("DELETE", `/threads/${tA}`, B.token);
check("B deletes A's thread -> 403", r.status === 403);

r = await api("DELETE", `/threads/${tB}`, B.token);
check("creator deletes own thread -> 200", r.status === 200);

r = await api("GET", `/threads/${tB}`, A.token);
check("deleted thread -> 404", r.status === 404);

// ---------- cascades ----------
r = await api("POST", `/servers/${serverId}/channels`, A.token, { name: "temp" });
const tempChanId = r.data.channel?._id;
r = await api("POST", `/channels/${tempChanId}/threads`, A.token, { name: "doomed" });
const doomedId = r.data.thread?._id;
r = await api("DELETE", `/channels/${tempChanId}`, A.token);
check("channel deleted", r.status === 200);
r = await api("GET", `/threads/${doomedId}`, A.token);
check("channel delete cascades threads -> 404", r.status === 404);

r = await api("DELETE", `/servers/${serverId}`, A.token);
check("server deleted", r.status === 200);
r = await api("GET", `/threads/${tA}`, A.token);
check("server delete cascades threads -> 404", r.status === 404);

// ---------- report ----------
const passed = results.filter((l) => l.startsWith("PASS")).length;
console.log(results.join("\n"));
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);

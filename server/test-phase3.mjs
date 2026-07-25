/* Live e2e test for Phase 3 (channels). Run: node test-phase3.mjs */
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
    username: `p3${tag}_${uniq}`,
    email: `p3${tag}_${uniq}@mail.com`,
    password: "Passw0rd123",
  });
  if (status !== 201) throw new Error(`register ${tag} failed: ${status} ${JSON.stringify(data)}`);
  return { token: data.accessToken, id: data.user._id };
};

const A = await register("a"); // owner
const B = await register("b"); // regular member

let r, serverId, generalId, studyId, voiceId, privateId, taRoleId;

// ---------- setup: server + auto #general ----------
r = await api("POST", "/servers", A.token, { name: `P3 Lab ${uniq}`, isPublic: true });
serverId = r.data.server?._id;
check("server created", r.status === 201);

r = await api("GET", `/servers/${serverId}/channels`, A.token);
check("auto #general created with server",
  r.status === 200 && r.data.channels?.length === 1 && r.data.channels[0].name === "general");
generalId = r.data.channels?.[0]?._id;

r = await api("POST", `/servers/${serverId}/join`, B.token);
check("B joined server", r.status === 200);

// ---------- create channels ----------
r = await api("POST", `/servers/${serverId}/channels`, B.token, { name: "hax" });
check("create channel without MANAGE_CHANNELS -> 403", r.status === 403);

r = await api("POST", `/servers/${serverId}/channels`, A.token, { name: "Study Hall", topic: "DSA sessions" });
check("create text channel -> 201 + name slugified + position 1",
  r.status === 201 && r.data.channel?.name === "study-hall" && r.data.channel?.position === 1);
studyId = r.data.channel?._id;

r = await api("POST", `/servers/${serverId}/channels`, A.token, { name: "Focus Room", type: "voice", userLimit: 5 });
check("create voice channel with userLimit -> 201", r.status === 201 && r.data.channel?.userLimit === 5);
voiceId = r.data.channel?._id;

r = await api("POST", `/servers/${serverId}/channels`, A.token, { name: "chat", userLimit: 10 });
check("userLimit on text channel -> 400", r.status === 400);

r = await api("POST", `/servers/${serverId}/channels`, A.token, { name: "bad!name" });
check("invalid channel name -> 400", r.status === 400);

r = await api("POST", `/servers/${serverId}/channels`, A.token, { name: "staff-only", isPrivate: true });
check("create private channel -> 201", r.status === 201 && r.data.channel?.isPrivate === true);
privateId = r.data.channel?._id;

r = await api("POST", `/servers/${serverId}/channels`, A.token, {
  name: "ghost", isPrivate: true, allowedRoleIds: ["aaaaaaaaaaaaaaaaaaaaaaaa"],
});
check("create channel with foreign roleId -> 400", r.status === 400);

// ---------- visibility ----------
r = await api("GET", `/servers/${serverId}/channels`, A.token);
check("owner sees all 4 channels", r.status === 200 && r.data.channels?.length === 4);

r = await api("GET", `/servers/${serverId}/channels`, B.token);
check("B sees only 3 (private hidden)",
  r.status === 200 && r.data.channels?.length === 3 &&
  !r.data.channels.some((c) => c._id === privateId));

r = await api("GET", `/channels/${privateId}`, B.token);
check("B GET private channel -> 403", r.status === 403);
r = await api("GET", `/channels/${privateId}`, A.token);
check("owner GET private channel -> 200", r.status === 200);
r = await api("GET", `/channels/${generalId}`, B.token);
check("B GET public channel -> 200", r.status === 200);

// grant B access via a role
r = await api("POST", `/servers/${serverId}/roles`, A.token, { name: "TA" });
taRoleId = r.data.role?._id;
r = await api("PUT", `/servers/${serverId}/members/${B.id}/roles`, A.token, { roleIds: [taRoleId] });
r = await api("PATCH", `/channels/${privateId}`, A.token, { allowedRoleIds: [taRoleId] });
check("PATCH private channel allowedRoleIds -> 200", r.status === 200);

r = await api("GET", `/channels/${privateId}`, B.token);
check("B can access private channel via TA role -> 200", r.status === 200);
r = await api("GET", `/servers/${serverId}/channels`, B.token);
check("B now sees 4 channels", r.data.channels?.length === 4);

// ---------- updates ----------
r = await api("PATCH", `/channels/${generalId}`, B.token, { topic: "hijack" });
check("PATCH channel without MANAGE_CHANNELS -> 403", r.status === 403);
r = await api("PATCH", `/channels/${generalId}`, A.token, { topic: "Welcome to the lab" });
check("PATCH channel topic -> 200", r.status === 200 && r.data.channel?.topic === "Welcome to the lab");
r = await api("PATCH", `/channels/${voiceId}`, A.token, { userLimit: 10 });
check("PATCH voice userLimit -> 200", r.status === 200 && r.data.channel?.userLimit === 10);
r = await api("PATCH", `/channels/${studyId}`, A.token, { userLimit: 10 });
check("PATCH userLimit on text channel -> 400", r.status === 400);
r = await api("PATCH", `/channels/${generalId}`, A.token, {});
check("PATCH empty body -> 400", r.status === 400);

// ---------- reorder ----------
r = await api("PATCH", `/servers/${serverId}/channels/positions`, A.token, {
  orderedIds: [privateId, voiceId, studyId, generalId],
});
check("reorder channels -> 200 + new order",
  r.status === 200 && r.data.channels?.[0]?._id === privateId && r.data.channels?.[3]?._id === generalId);

r = await api("PATCH", `/servers/${serverId}/channels/positions`, A.token, { orderedIds: [generalId] });
check("reorder with missing ids -> 400", r.status === 400);
r = await api("PATCH", `/servers/${serverId}/channels/positions`, B.token, {
  orderedIds: [generalId, studyId, voiceId, privateId],
});
check("reorder without MANAGE_CHANNELS -> 403", r.status === 403);

// ---------- role deletion pulls channel access ----------
r = await api("DELETE", `/servers/${serverId}/roles/${taRoleId}`, A.token);
check("delete TA role -> 200", r.status === 200);
r = await api("GET", `/channels/${privateId}`, B.token);
check("B lost private channel access after role delete -> 403", r.status === 403);

// ---------- errors ----------
r = await api("GET", "/channels/nope", A.token);
check("GET /channels/:id malformed -> 400", r.status === 400);
r = await api("GET", "/channels/aaaaaaaaaaaaaaaaaaaaaaaa", A.token);
check("GET /channels/:id unknown -> 404", r.status === 404);

// ---------- delete channels ----------
r = await api("DELETE", `/channels/${studyId}`, B.token);
check("DELETE channel without perm -> 403", r.status === 403);
r = await api("DELETE", `/channels/${studyId}`, A.token);
check("DELETE study-hall -> 200", r.status === 200);
await api("DELETE", `/channels/${voiceId}`, A.token);
await api("DELETE", `/channels/${privateId}`, A.token);
r = await api("DELETE", `/channels/${generalId}`, A.token);
check("DELETE last remaining channel -> 400 (must keep one)", r.status === 400);

// ---------- server delete cascades channels ----------
r = await api("DELETE", `/servers/${serverId}`, A.token);
check("server deleted", r.status === 200);
r = await api("GET", `/channels/${generalId}`, A.token);
check("channel gone after server delete -> 404", r.status === 404);

console.log(results.join("\n"));
const failed = results.filter((x) => x.startsWith("FAIL"));
console.log(`\nRESULT: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);

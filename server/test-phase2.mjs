/* Live e2e test for Phase 2 (servers, roles, members, invites). Run: node test-phase2.mjs */
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
    username: `p2${tag}_${uniq}`,
    email: `p2${tag}_${uniq}@mail.com`,
    password: "Passw0rd123",
  });
  if (status !== 201) throw new Error(`register ${tag} failed: ${status} ${JSON.stringify(data)}`);
  return { token: data.accessToken, id: data.user._id };
};

const A = await register("a"); // owner
const B = await register("b"); // moderator
const C = await register("c"); // regular

const PERM = { ADMIN: 1, MANAGE_SERVER: 2, MANAGE_ROLES: 8, KICK: 16, INVITES: 32, VIEW: 64, SEND: 128 };
let r, serverId, everyoneRoleId, modRoleId, inviteCode;

// ---------- create / list / discover ----------
r = await api("GET", "/servers", null);
check("GET /servers no token -> 401", r.status === 401);

r = await api("POST", "/servers", A.token, { name: "x" });
check("POST /servers invalid name -> 400", r.status === 400);

r = await api("POST", "/servers", A.token, {
  name: `CSE Hub ${uniq}`, description: "DSA & WebDev", isPublic: true, tags: ["DSA", "webdev", "dsa"],
});
check("POST /servers -> 201 + memberCount 1 + tags deduped/lowercased",
  r.status === 201 && r.data.server?.memberCount === 1 &&
  JSON.stringify(r.data.server?.tags) === JSON.stringify(["dsa", "webdev"]),
  `status=${r.status}`);
serverId = r.data.server?._id;

r = await api("GET", "/servers", A.token);
check("GET /servers (mine) -> contains new server", r.status === 200 && r.data.servers?.some((s) => s._id === serverId));

r = await api("GET", `/servers/${serverId}`, A.token);
check("GET /servers/:id -> 200 + auto @everyone role",
  r.status === 200 && r.data.roles?.length === 1 && r.data.roles[0].isDefault === true);
everyoneRoleId = r.data.roles?.[0]?._id;

r = await api("GET", `/servers/discover?search=cse hub&tag=dsa`, B.token);
check("GET /servers/discover?search&tag -> finds public server",
  r.status === 200 && r.data.servers?.some((s) => s._id === serverId));

r = await api("GET", "/servers/badid", A.token);
check("GET /servers/:id malformed -> 400", r.status === 400);
r = await api("GET", "/servers/aaaaaaaaaaaaaaaaaaaaaaaa", A.token);
check("GET /servers/:id unknown -> 404", r.status === 404);

// ---------- membership & basic permissions ----------
r = await api("GET", `/servers/${serverId}`, B.token);
check("GET /servers/:id as non-member -> 403", r.status === 403);

r = await api("POST", `/servers/${serverId}/join`, B.token);
check("POST /servers/:id/join (public) -> 200", r.status === 200);
r = await api("POST", `/servers/${serverId}/join`, B.token);
check("POST join twice -> 409", r.status === 409);

r = await api("PATCH", `/servers/${serverId}`, B.token, { name: "Hacked" });
check("PATCH server without MANAGE_SERVER -> 403", r.status === 403);

r = await api("PATCH", `/servers/${serverId}`, A.token, { description: "Updated desc" });
check("PATCH server as owner -> 200", r.status === 200 && r.data.server?.description === "Updated desc");

// ---------- roles ----------
r = await api("POST", `/servers/${serverId}/roles`, A.token, { name: "@everyone" });
check("POST role named @everyone -> 400", r.status === 400);

r = await api("POST", `/servers/${serverId}/roles`, A.token, {
  name: "Moderator", color: "#5865f2",
  permissions: PERM.MANAGE_SERVER | PERM.KICK | PERM.INVITES | PERM.VIEW | PERM.SEND,
  position: 5,
});
check("POST /servers/:id/roles -> 201", r.status === 201 && r.data.role?.name === "Moderator");
modRoleId = r.data.role?._id;

r = await api("POST", `/servers/${serverId}/roles`, B.token, { name: "Sneaky" });
check("POST role without MANAGE_ROLES -> 403", r.status === 403);

r = await api("PUT", `/servers/${serverId}/members/${B.id}/roles`, A.token, { roleIds: [everyoneRoleId] });
check("PUT member roles with @everyone -> 400", r.status === 400);

r = await api("PUT", `/servers/${serverId}/members/${B.id}/roles`, A.token, { roleIds: [modRoleId] });
check("PUT member roles -> 200 + assigned", r.status === 200 && r.data.member?.roleIds?.length === 1);

r = await api("PATCH", `/servers/${serverId}`, B.token, { name: `CSE Hub v2 ${uniq}` });
check("PATCH server now allowed via Moderator role -> 200 (bitfield works)", r.status === 200);

r = await api("PATCH", `/servers/${serverId}/roles/${everyoneRoleId}`, A.token, { name: "plebs" });
check("PATCH rename @everyone -> 400", r.status === 400);
r = await api("PATCH", `/servers/${serverId}/roles/${everyoneRoleId}`, A.token, { permissions: PERM.VIEW | PERM.SEND });
check("PATCH @everyone permissions -> 200", r.status === 200);
r = await api("DELETE", `/servers/${serverId}/roles/${everyoneRoleId}`, A.token);
check("DELETE @everyone role -> 400", r.status === 400);

// ---------- invites ----------
r = await api("POST", `/servers/${serverId}/invites`, A.token, { maxUses: 1, expiresInHours: 24 });
check("POST /servers/:id/invites -> 201 + code", r.status === 201 && !!r.data.invite?.code);
inviteCode = r.data.invite?.code;

r = await api("GET", `/invites/${inviteCode}`, C.token);
check("GET /invites/:code preview -> 200 + server info", r.status === 200 && !!r.data.invite?.server?.name);

r = await api("POST", `/invites/${inviteCode}/join`, C.token);
check("POST /invites/:code/join -> 200", r.status === 200 && r.data.server?._id === serverId);

r = await api("GET", `/servers/${serverId}`, C.token);
check("C is now a member, memberCount = 3", r.status === 200 && r.data.server?.memberCount === 3);

r = await api("GET", `/invites/${inviteCode}`, B.token);
check("GET used-up invite (maxUses reached) -> 404", r.status === 404);

r = await api("GET", `/servers/${serverId}/invites`, B.token);
check("GET server invites with MANAGE_SERVER -> 200", r.status === 200);
r = await api("GET", `/servers/${serverId}/invites`, C.token);
check("GET server invites without perm -> 403", r.status === 403);

r = await api("POST", `/servers/${serverId}/invites`, A.token, {});
const code2 = r.data.invite?.code;
r = await api("DELETE", `/invites/${code2}`, A.token);
check("DELETE /invites/:code by creator -> 200", r.status === 200);
r = await api("GET", `/invites/${code2}`, A.token);
check("GET revoked invite -> 404", r.status === 404);

// ---------- nicknames ----------
r = await api("PATCH", `/servers/${serverId}/members/${C.id}`, C.token, { nickname: "Cee" });
check("PATCH own nickname -> 200", r.status === 200 && r.data.member?.nickname === "Cee");
r = await api("PATCH", `/servers/${serverId}/members/${A.id}`, C.token, { nickname: "Boss" });
check("PATCH someone else's nickname without perm -> 403", r.status === 403);
r = await api("PATCH", `/servers/${serverId}/members/${C.id}`, A.token, { nickname: "Cee2" });
check("PATCH nickname as MANAGE_SERVER -> 200", r.status === 200);

// ---------- members list & kick ----------
r = await api("GET", `/servers/${serverId}/members`, A.token);
check("GET /servers/:id/members -> 200 + populated user",
  r.status === 200 && r.data.members?.length === 3 && !!r.data.members[0].userId?.username);

r = await api("DELETE", `/servers/${serverId}/members/${B.id}`, C.token);
check("kick without KICK_MEMBERS -> 403", r.status === 403);
r = await api("DELETE", `/servers/${serverId}/members/${A.id}`, B.token);
check("kick the owner -> 403", r.status === 403);
r = await api("DELETE", `/servers/${serverId}/members/${A.id}`, A.token);
check("kick yourself -> 400", r.status === 400);
r = await api("DELETE", `/servers/${serverId}/members/${C.id}`, B.token);
check("kick C with KICK_MEMBERS -> 200", r.status === 200);
r = await api("GET", `/servers/${serverId}`, A.token);
check("memberCount back to 2 after kick", r.data.server?.memberCount === 2);
r = await api("GET", `/servers/${serverId}`, C.token);
check("kicked user no longer a member -> 403", r.status === 403);

// ---------- role deletion cleans up members ----------
r = await api("DELETE", `/servers/${serverId}/roles/${modRoleId}`, A.token);
check("DELETE Moderator role -> 200", r.status === 200);
r = await api("PATCH", `/servers/${serverId}`, B.token, { name: "Nope" });
check("B lost MANAGE_SERVER after role delete -> 403", r.status === 403);
r = await api("GET", `/servers/${serverId}/members`, A.token);
const bMember = r.data.members?.find((m) => m.userId?._id === B.id);
check("B's roleIds pulled clean", bMember?.roleIds?.length === 0);

// ---------- leave / transfer / delete ----------
r = await api("POST", `/servers/${serverId}/leave`, A.token);
check("owner tries to leave -> 400", r.status === 400);

r = await api("POST", `/servers/${serverId}/transfer-ownership`, B.token, { newOwnerId: B.id });
check("transfer by non-owner -> 403", r.status === 403);
r = await api("POST", `/servers/${serverId}/transfer-ownership`, A.token, { newOwnerId: C.id });
check("transfer to non-member -> 400", r.status === 400);
r = await api("POST", `/servers/${serverId}/transfer-ownership`, A.token, { newOwnerId: A.id });
check("transfer to self -> 400", r.status === 400);
r = await api("POST", `/servers/${serverId}/transfer-ownership`, A.token, { newOwnerId: B.id });
check("transfer to B -> 200 + ownerId updated", r.status === 200 && r.data.server?.ownerId === B.id);

r = await api("POST", `/servers/${serverId}/leave`, A.token);
check("ex-owner can now leave -> 200", r.status === 200);

r = await api("DELETE", `/servers/${serverId}`, A.token);
check("DELETE server after leaving -> 403 (not a member)", r.status === 403);
r = await api("DELETE", `/servers/${serverId}`, B.token);
check("DELETE server as new owner -> 200", r.status === 200);
r = await api("GET", `/servers/${serverId}`, B.token);
check("server gone -> 404", r.status === 404);

console.log(results.join("\n"));
const failed = results.filter((x) => x.startsWith("FAIL"));
console.log(`\nRESULT: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);

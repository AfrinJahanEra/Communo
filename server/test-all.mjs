/* Full live API test for all implemented endpoints (Phase 1). Run: node test-all.mjs */
const HOST = "http://localhost:5000";
const BASE = `${HOST}/api/v1`;
const jar = new Map();

const storeCookies = (res) => {
  for (const c of res.headers.getSetCookie?.() || []) {
    const [pair] = c.split(";");
    const [name, ...v] = pair.split("=");
    const value = v.join("=");
    if (value === "" || /Expires=Thu, 01 Jan 1970/.test(c)) jar.delete(name.trim());
    else jar.set(name.trim(), value);
  }
};

const call = async (method, path, body, extraHeaders = {}, rawBody = null) => {
  const headers = { ...extraHeaders };
  if (body) headers["Content-Type"] = "application/json";
  if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const res = await fetch(path.startsWith("http") ? path : BASE + path, {
    method,
    headers,
    body: rawBody || (body ? JSON.stringify(body) : undefined),
  });
  storeCookies(res);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

const results = [];
const check = (name, cond, detail = "") =>
  results.push(`${cond ? "PASS" : "FAIL"} | ${name}${detail ? ` -- ${detail}` : ""}`);

const uniq = Date.now().toString(36);
const user = { username: `qa_${uniq}`, email: `qa_${uniq}@mail.com`, password: "Passw0rd123" };
let r, userId, accessToken;

// ---------- PUBLIC ----------
r = await call("GET", "/health");
check("GET  /health", r.status === 200, `status=${r.status}`);

r = await call("GET", `${HOST}/`);
check("GET  / (root)", r.status === 200);

r = await call("GET", "/does-not-exist");
check("GET  unknown route -> 404", r.status === 404);

// ---------- AUTH ----------
r = await call("POST", "/auth/register", { username: "x", email: "bad", password: "1" });
check("POST /auth/register invalid -> 400 + field errors", r.status === 400 && r.data.errors?.length >= 2);

r = await call("POST", "/auth/register", user);
check("POST /auth/register -> 201 + user + accessToken + cookies",
  r.status === 201 && !!r.data.user && !!r.data.accessToken && jar.has("accessToken") && jar.has("refreshToken"),
  `status=${r.status}`);
check("     password not in response", r.data.user?.password === undefined);
userId = r.data.user?._id;
accessToken = r.data.accessToken;

r = await call("POST", "/auth/register", user);
check("POST /auth/register duplicate -> 409", r.status === 409);

r = await call("GET", "/auth/me");
check("GET  /auth/me (cookie auth)", r.status === 200 && r.data.user?.username === user.username);

// Bearer-only (no cookies)
const savedJar = new Map(jar);
jar.clear();
r = await call("GET", "/auth/me", null, { Authorization: `Bearer ${accessToken}` });
check("GET  /auth/me (Bearer auth)", r.status === 200);
r = await call("GET", "/users/me");
check("GET  /users/me no token -> 401", r.status === 401);
r = await call("GET", "/users/me", null, { Authorization: "Bearer garbage.token.here" });
check("GET  /users/me bad token -> 401", r.status === 401);
savedJar.forEach((v, k) => jar.set(k, v));

r = await call("POST", "/auth/login", { email: user.email, password: "WrongPass9" });
check("POST /auth/login wrong password -> 401", r.status === 401);

r = await call("POST", "/auth/login", { email: user.email, password: user.password });
check("POST /auth/login -> 200", r.status === 200 && !!r.data.accessToken);
accessToken = r.data.accessToken;

// Refresh + rotation
const oldRefresh = jar.get("refreshToken");
r = await call("POST", "/auth/refresh");
check("POST /auth/refresh -> 200 + rotated token",
  r.status === 200 && !!r.data.accessToken && jar.get("refreshToken") !== oldRefresh);

// Theft detection
const legit = jar.get("refreshToken");
jar.set("refreshToken", oldRefresh);
r = await call("POST", "/auth/refresh");
check("POST /auth/refresh reused old token -> 401 (theft detected)", r.status === 401);
jar.set("refreshToken", legit);
r = await call("POST", "/auth/refresh");
check("     legit token also dead (family revoked) -> 401", r.status === 401);

r = await call("POST", "/auth/login", { email: user.email, password: user.password });
check("POST /auth/login (re-login) -> 200", r.status === 200);
accessToken = r.data.accessToken;

// ---------- USERS ----------
r = await call("GET", "/users/me");
check("GET  /users/me -> 200", r.status === 200);

r = await call("PATCH", "/users/me", { displayName: "QA Bot", bio: "Testing CodeCord" });
check("PATCH /users/me -> 200 + updated", r.status === 200 && r.data.user?.displayName === "QA Bot");

r = await call("PATCH", "/users/me", {});
check("PATCH /users/me empty body -> 400", r.status === 400);

r = await call("GET", `/users/${userId}`);
check("GET  /users/:id -> 200 public profile", r.status === 200 && !!r.data.user);
check("     public profile hides email/role", r.data.user?.email === undefined && r.data.user?.role === undefined);

r = await call("GET", "/users/12345");
check("GET  /users/:id invalid id -> 400", r.status === 400);

r = await call("GET", "/users/aaaaaaaaaaaaaaaaaaaaaaaa");
check("GET  /users/:id unknown id -> 404", r.status === 404);

// Avatar upload (real 1x1 PNG via multipart)
const pngB64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const fd = new FormData();
fd.append("avatar", new Blob([Buffer.from(pngB64, "base64")], { type: "image/png" }), "avatar.png");
{
  const headers = { Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") };
  const res = await fetch(`${BASE}/users/me/avatar`, { method: "POST", headers, body: fd });
  const data = await res.json().catch(() => ({}));
  check("POST /users/me/avatar (Cloudinary upload)",
    res.status === 200 && /^https?:\/\//.test(data.user?.avatar || ""),
    `status=${res.status}${data.message ? " msg=" + data.message : ""}`);
}

// ---------- PASSWORD & SESSIONS ----------
r = await call("PATCH", "/users/me/password", { currentPassword: "WrongOld1", newPassword: "NewPassw0rd456" });
check("PATCH /users/me/password wrong current -> 401", r.status === 401);

r = await call("PATCH", "/users/me/password", { currentPassword: user.password, newPassword: "NewPassw0rd456" });
check("PATCH /users/me/password -> 200", r.status === 200);

r = await call("POST", "/auth/refresh");
check("     all sessions revoked after pw change -> 401", r.status === 401);

r = await call("POST", "/auth/login", { email: user.email, password: "NewPassw0rd456" });
check("POST /auth/login with NEW password -> 200", r.status === 200);
accessToken = r.data.accessToken;

// logout-all
r = await call("POST", "/auth/logout-all", null, { Authorization: `Bearer ${accessToken}` });
check("POST /auth/logout-all -> 200", r.status === 200);
r = await call("POST", "/auth/refresh");
check("     refresh after logout-all -> 401", r.status === 401);

// logout
r = await call("POST", "/auth/login", { email: user.email, password: "NewPassw0rd456" });
r = await call("POST", "/auth/logout");
check("POST /auth/logout -> 200 + cookies cleared", r.status === 200 && !jar.has("accessToken"));
r = await call("POST", "/auth/refresh");
check("     refresh after logout -> 401", r.status === 401);

// ---------- LEGACY ALIAS ----------
r = await call("GET", `${HOST}/api/health`);
check("GET  /api/health (legacy alias)", r.status === 200);

console.log(results.join("\n"));
const failed = results.filter((x) => x.startsWith("FAIL"));
console.log(`\nRESULT: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);

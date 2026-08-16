import api, { setAccessToken } from "../lib/api";

export const register = async (payload) => {
  const { data } = await api.post("/auth/register", payload);
  // With email verification required the server returns no token yet
  if (data.accessToken) setAccessToken(data.accessToken);
  return data;
};

export const login = async (payload) => {
  const { data } = await api.post("/auth/login", payload);
  setAccessToken(data.accessToken);
  return data;
};

/** Separate admin entry: email + secret key, no email verification. */
export const adminLogin = async (payload) => {
  const { data } = await api.post("/auth/admin-login", payload);
  setAccessToken(data.accessToken);
  return data;
};

/** Submits the emailed 6-digit code; the server logs the user in on success. */
export const verifyEmail = async ({ email, code }) => {
  const { data } = await api.post("/auth/verify-email", { email, code });
  setAccessToken(data.accessToken);
  return data;
};

export const resendVerification = async (email) => {
  const { data } = await api.post("/auth/resend-verification", { email });
  return data;
};

/** Exchanges a Google ID token for a Communo session. */
export const googleLogin = async (credential) => {
  const { data } = await api.post("/auth/google", { credential });
  setAccessToken(data.accessToken);
  return data;
};

export const logout = async () => {
  const { data } = await api.post("/auth/logout");
  setAccessToken(null);
  return data;
};

export const logoutAll = async () => {
  const { data } = await api.post("/auth/logout-all");
  setAccessToken(null);
  return data;
};

export const getMe = async () => {
  const { data } = await api.get("/auth/me");
  return data;
};
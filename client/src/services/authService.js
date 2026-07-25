import api, { setAccessToken } from "../lib/api";

export const register = async (payload) => {
  const { data } = await api.post("/auth/register", payload);
  setAccessToken(data.accessToken);
  return data;
};

export const login = async (payload) => {
  const { data } = await api.post("/auth/login", payload);
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

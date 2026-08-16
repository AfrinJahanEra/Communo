import api from "../lib/api";

/** Read-only platform insights for the admin dashboard. */

export const getOverview = async () => {
  const { data } = await api.get("/admin/overview");
  return data;
};

export const listUsers = async ({ search = "", page = 1 } = {}) => {
  const { data } = await api.get("/admin/users", { params: { search, page, limit: 25 } });
  return data;
};

export const listServers = async ({ search = "", page = 1 } = {}) => {
  const { data } = await api.get("/admin/servers", { params: { search, page, limit: 25 } });
  return data;
};

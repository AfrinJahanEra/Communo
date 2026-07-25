import api from "../lib/api";

export const updateProfile = async (payload) => {
  const { data } = await api.patch("/users/me", payload);
  return data.user;
};

export const uploadAvatar = async (file) => {
  const form = new FormData();
  form.append("avatar", file);
  const { data } = await api.post("/users/me/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.user;
};

export const changePassword = async (payload) => {
  const { data } = await api.patch("/users/me/password", payload);
  return data;
};

export const getUser = async (userId) => {
  const { data } = await api.get(`/users/${userId}`);
  return data.user;
};

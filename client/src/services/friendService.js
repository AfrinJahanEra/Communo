import api from "../lib/api";

export const sendFriendRequest = async (payload) => {
  // payload: { userId } or { username }
  const { data } = await api.post("/friends/requests", payload);
  return data;
};

export const listFriendRequests = async () => {
  const { data } = await api.get("/friends/requests");
  return data; // { incoming, outgoing }
};

export const searchUsers = async (query) => {
  const { data } = await api.get("/friends/search", { params: { query } });
  return data.users;
};

export const acceptFriendRequest = async (requestId) => {
  const { data } = await api.post(`/friends/requests/${requestId}/accept`);
  return data;
};

export const declineFriendRequest = async (requestId) => {
  const { data } = await api.delete(`/friends/requests/${requestId}`);
  return data;
};

export const listFriends = async () => {
  const { data } = await api.get("/friends");
  return data.friends;
};

export const removeFriend = async (userId) => {
  const { data } = await api.delete(`/friends/${userId}`);
  return data;
};

export const blockUser = async (userId) => {
  const { data } = await api.post("/friends/blocks", { userId });
  return data;
};

export const listBlocks = async () => {
  const { data } = await api.get("/friends/blocks");
  return data.blocks;
};

export const unblockUser = async (userId) => {
  const { data } = await api.delete(`/friends/blocks/${userId}`);
  return data;
};

export const getFriendsPresence = async () => {
  const { data } = await api.get("/friends/presence");
  return data.presences;
};

import User from "../models/User.js";
import Server from "../models/Server.js";
import ServerMember from "../models/ServerMember.js";
import Channel from "../models/Channel.js";
import Message from "../models/Message.js";
import DirectMessage from "../models/DirectMessage.js";

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Platform-wide counters for the admin overview. */
export const getOverview = async () => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    verifiedUsers,
    newUsersThisWeek,
    totalServers,
    totalChannels,
    channelMessages,
    directMessages,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isEmailVerified: true }),
    User.countDocuments({ createdAt: { $gte: weekAgo } }),
    Server.countDocuments(),
    Channel.countDocuments(),
    Message.countDocuments(),
    DirectMessage.countDocuments(),
  ]);

  return {
    users: {
      total: totalUsers,
      verified: verifiedUsers,
      newThisWeek: newUsersThisWeek,
    },
    servers: { total: totalServers },
    channels: { total: totalChannels },
    messages: {
      total: channelMessages + directMessages,
      channel: channelMessages,
      direct: directMessages,
    },
  };
};

/** Paginated user directory with optional text search. */
export const listUsers = async ({ search = "", page = 1, limit = 25 } = {}) => {
  const query = search.trim()
    ? {
        $or: [
          { username: new RegExp(escapeRegex(search.trim()), "i") },
          { displayName: new RegExp(escapeRegex(search.trim()), "i") },
          { email: new RegExp(escapeRegex(search.trim()), "i") },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(
        "username displayName email avatar role isEmailVerified isActive createdAt lastSeenAt"
      ),
    User.countDocuments(query),
  ]);

  return {
    users,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
};

/** Paginated server directory with member/channel counts and optional search. */
export const listServers = async ({ search = "", page = 1, limit = 25 } = {}) => {
  const query = search.trim()
    ? { name: new RegExp(escapeRegex(search.trim()), "i") }
    : {};

  const [servers, total, memberCounts, channelCounts] = await Promise.all([
    Server.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("ownerId", "username displayName avatar"),
    Server.countDocuments(query),
    ServerMember.aggregate([{ $group: { _id: "$serverId", count: { $sum: 1 } } }]),
    Channel.aggregate([{ $group: { _id: "$serverId", count: { $sum: 1 } } }]),
  ]);

  const memberMap = new Map(memberCounts.map((row) => [String(row._id), row.count]));
  const channelMap = new Map(channelCounts.map((row) => [String(row._id), row.count]));

  return {
    servers: servers.map((server) => ({
      ...server.toJSON(),
      memberCount: memberMap.get(String(server._id)) || 0,
      channelCount: channelMap.get(String(server._id)) || 0,
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
};

import Server from "../models/Server.js";

export const create = async (data, session) => {
  const [server] = await Server.create([data], { session });
  return server;
};

export const findById = (id) => Server.findById(id);

export const findByIds = (ids) => Server.find({ _id: { $in: ids } });

export const updateById = (id, update) =>
  Server.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true });

export const deleteById = (id, session) => Server.findByIdAndDelete(id, { session });

export const incrementMemberCount = (id, delta, session) =>
  Server.updateOne({ _id: id }, { $inc: { memberCount: delta } }, { session });

export const discover = ({ search, tag, page = 1, limit = 20 }) => {
  const filter = { isPublic: true };
  if (tag) filter.tags = tag.toLowerCase();
  if (search) filter.name = { $regex: search, $options: "i" };
  return Server.find(filter)
    .sort({ memberCount: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .select("name description icon tags memberCount createdAt");
};

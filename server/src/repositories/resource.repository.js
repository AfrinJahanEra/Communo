import Resource from "../models/Resource.js";

const UPLOADER_FIELDS = "username displayName avatar";

export const create = (data) => Resource.create(data);

export const findById = (id) => Resource.findById(id).populate("uploaderId", UPLOADER_FIELDS);

/** AI context builder needs the (normally deselected) extracted text. */
export const findByIdsWithText = (ids) =>
  Resource.find({ _id: { $in: ids } }).select("+textContent");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const findByServer = async (serverId, { search, tag, page = 1, limit = 20 }) => {
  const filter = { serverId };
  if (tag) filter.tags = tag.toLowerCase();
  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ title: regex }, { description: regex }];
  }
  const [resources, total] = await Promise.all([
    Resource.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("uploaderId", UPLOADER_FIELDS),
    Resource.countDocuments(filter),
  ]);
  return { resources, total, page, pages: Math.ceil(total / limit) || 1 };
};

export const updateById = (id, update) =>
  Resource.findByIdAndUpdate(id, update, {
    returnDocument: "after",
    runValidators: true,
  }).populate("uploaderId", UPLOADER_FIELDS);

export const deleteById = (id) => Resource.findByIdAndDelete(id);

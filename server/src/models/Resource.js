import mongoose from "mongoose";

export const RESOURCE_KINDS = Object.freeze({
  PDF: "pdf",
  TEXT: "text",
  DOCUMENT: "document",
  SLIDES: "slides",
  IMAGE: "image",
});

export const TEXT_STATUS = Object.freeze({
  NONE: "none", // format has no extractable text (e.g. images)
  DONE: "done",
  FAILED: "failed",
});

/**
 * A shared study material scoped to one server. `textContent` holds the
 * extracted text (PDF/txt/md) used as context by the AI doubt solver;
 * chunking + embeddings can layer on top of this field later.
 */
const resourceSchema = new mongoose.Schema(
  {
    serverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Server",
      required: true,
    },
    uploaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [120, "Title cannot exceed 120 characters"],
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    tags: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
      default: [],
    },
    kind: {
      type: String,
      enum: Object.values(RESOURCE_KINDS),
      required: true,
    },
    originalName: {
      type: String,
      required: true,
      maxlength: 255,
    },
    mimeType: {
      type: String,
      required: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    // Cloudinary bookkeeping for deletion + signed download URLs
    publicId: {
      type: String,
      required: true,
    },
    resourceType: {
      type: String,
      enum: ["raw", "image"],
      default: "raw",
    },
    textStatus: {
      type: String,
      enum: Object.values(TEXT_STATUS),
      default: TEXT_STATUS.NONE,
    },
    textContent: {
      type: String,
      default: "",
      select: false, // large: fetched only by the AI context builder
    },
  },
  { timestamps: true }
);

resourceSchema.index({ serverId: 1, createdAt: -1 });
resourceSchema.index({ serverId: 1, tags: 1 });

const Resource = mongoose.model("Resource", resourceSchema);

export default Resource;

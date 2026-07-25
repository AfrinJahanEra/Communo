import mongoose from "mongoose";

const serverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Server name is required"],
      trim: true,
      minlength: [2, "Server name must be at least 2 characters"],
      maxlength: [100, "Server name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    icon: {
      type: String,
      default: "",
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
      set: (tags) => [...new Set(tags.map((t) => t.toLowerCase().trim()))],
    },
    // Denormalized for cheap listing/discovery; maintained by member services
    memberCount: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

// Discovery: public servers filtered by tag, newest first
serverSchema.index({ isPublic: 1, createdAt: -1 });
serverSchema.index({ isPublic: 1, tags: 1 });
serverSchema.index({ name: "text", description: "text" });

const Server = mongoose.model("Server", serverSchema);

export default Server;

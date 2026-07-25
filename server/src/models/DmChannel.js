import mongoose from "mongoose";

/** 1:1 direct-message conversation between two friends. */
const dmChannelSchema = new mongoose.Schema(
  {
    participantIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      required: true,
      validate: {
        validator: (ids) => ids.length === 2,
        message: "A DM channel must have exactly 2 participants",
      },
    },
    // Sorted "idA:idB" — makes the pair unique regardless of who opened it
    pairKey: {
      type: String,
      required: true,
      unique: true,
    },
    // Bumped on every message so DM lists sort by recency
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

dmChannelSchema.index({ participantIds: 1, lastMessageAt: -1 });

/** Canonical pair key for two user ids (order-independent). */
export const dmPairKey = (a, b) => [a.toString(), b.toString()].sort().join(":");

const DmChannel = mongoose.model("DmChannel", dmChannelSchema);

export default DmChannel;

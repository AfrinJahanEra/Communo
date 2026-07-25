import mongoose from "mongoose";

/**
 * One document per friend edge. `pending` = request sent, awaiting the
 * recipient; `accepted` = friendship. Declines/cancels delete the doc.
 */
const relationshipSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending",
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// One edge per direction; the reverse direction is checked in the service
relationshipSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });
relationshipSchema.index({ recipientId: 1, status: 1 });

const Relationship = mongoose.model("Relationship", relationshipSchema);

export default Relationship;

import mongoose from "mongoose";

export const VERIFICATION_TOKEN_TYPES = {
  EMAIL_VERIFICATION: "email_verification",
  PASSWORD_RESET: "password_reset", // reserved for the reset flow later
};

/**
 * Single-use tokens sent by email. Only the SHA-256 hash is stored, so a
 * leaked database does not hand out working verification links.
 */
const verificationTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(VERIFICATION_TOKEN_TYPES),
      default: VERIFICATION_TOKEN_TYPES.EMAIL_VERIFICATION,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// MongoDB deletes documents once expiresAt passes (housekeeping only —
// the service still checks expiry explicitly, since the TTL monitor runs
// about once a minute and is not precise).
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const VerificationToken = mongoose.model("VerificationToken", verificationTokenSchema);

export default VerificationToken;
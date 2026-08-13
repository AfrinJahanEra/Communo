import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { GLOBAL_ROLES, GLOBAL_ROLE_VALUES } from "../constants/roles.js";

export const AUTH_PROVIDERS = {
  LOCAL: "local",
  GOOGLE: "google",
};

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [/^[a-z0-9_.]+$/, "Username may only contain letters, numbers, dots and underscores"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      // Google-only accounts never have a password
      required: [
        function () {
          return this.authProvider === AUTH_PROVIDERS.LOCAL;
        },
        "Password is required",
      ],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // never returned by queries unless explicitly selected
    },
    authProvider: {
      type: String,
      enum: Object.values(AUTH_PROVIDERS),
      default: AUTH_PROVIDERS.LOCAL,
    },
    googleId: {
      type: String,
      // sparse: documents without the field are excluded from the unique index.
      // Never store `null` here or the second null would collide.
      unique: true,
      sparse: true,
      default: undefined,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, "Display name cannot exceed 50 characters"],
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
      maxlength: [200, "Bio cannot exceed 200 characters"],
    },
    role: {
      type: String,
      enum: GLOBAL_ROLE_VALUES,
      default: GLOBAL_ROLES.USER,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password whenever it is set/changed
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = function (candidate) {
  // Google-only accounts have no hash to compare against
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

// Hide sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.googleId;
  delete obj.__v;
  return obj;
};

const User = mongoose.model("User", userSchema);

export default User;
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

/** "true"/"false" strings from .env — z.coerce.boolean() would treat "false" as true. */
const booleanString = (defaultValue) =>
  z
    .enum(["true", "false"])
    .default(defaultValue)
    .transform((value) => value === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  CLIENT_URL: z.string().default("http://localhost:5173"),

  // Public base URL of this API, used to build URLs for locally stored
  // uploads when Cloudinary is unavailable.
  PUBLIC_URL: z.string().default("http://localhost:5000"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().default(7),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  // Optional integrations: endpoints guard with 503 when unconfigured,
  // so the API still boots without these accounts (dev-friendly).
  JDOODLE_CLIENT_ID: z.string().optional(),
  JDOODLE_CLIENT_SECRET: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),

  // SMTP — when unset, verification links are logged to the console instead
  // of emailed, so local development works without a mail account.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("Communo <no-reply@communo.local>"),
  EMAIL_VERIFICATION_EXPIRES_HOURS: z.coerce.number().default(24),

  // Set to "false" to let unverified users log in (useful while testing).
  REQUIRE_EMAIL_VERIFICATION: booleanString("true"),

  // Registration/login is restricted to these email domains (comma-separated,
  // leading "@" optional). Leave empty to allow any email.
  ALLOWED_EMAIL_DOMAINS: z
    .string()
    .default("iut-dhaka.edu")
    .transform((value) =>
      value
        .split(",")
        .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
        .filter(Boolean)
    ),

  // Google Sign-In: the OAuth *client ID* only. The client secret is not
  // needed because the browser sends us an ID token we verify by signature.
  GOOGLE_CLIENT_ID: z.string().optional(),

  // Platform admin: separate email + secret-key login, no email verification.
  ADMIN_EMAIL: z.string().trim().toLowerCase().default("admin@gmail.com"),
  ADMIN_SECRET_KEY: z.string().min(3, "ADMIN_SECRET_KEY must be at least 3 characters").default("ad123"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  // Fail fast: never boot with an invalid configuration
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === "production",
  isDevelopment: parsed.data.NODE_ENV === "development",
  isMailConfigured: Boolean(
    parsed.data.SMTP_HOST && parsed.data.SMTP_USER && parsed.data.SMTP_PASS
  ),
  isGoogleConfigured: Boolean(parsed.data.GOOGLE_CLIENT_ID),
};

export default env;

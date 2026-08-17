import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pinoHttp } from "pino-http";
import env from "./config/env.js";
import logger from "./utils/logger.js";
import apiRouter from "./routes/index.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.set("trust proxy", 1); // correct client IPs behind a reverse proxy

// Security & parsing
app.use(helmet());
app.use(
  cors({
    origin: [
      env.CLIENT_URL,
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// Request logging (quiet in dev, structured in prod)
app.use(
  pinoHttp({
    logger,
    autoLogging: env.isProduction,
  })
);

// Rate limiting
app.use("/api", generalLimiter);

// Locally stored uploads (fallback when Cloudinary credentials are unavailable)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Legacy local files were stored without an extension, so express.static
 * would serve them as octet-stream and helmet's nosniff header stops the
 * browser rendering them. Sniff magic bytes to recover the MIME type.
 */
const sniffContentType = (filePath) => {
  let fd = null;
  try {
    fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(12);
    fs.readSync(fd, buf, 0, 12, 0);
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
    if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
    if (buf.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
    return null;
  } catch {
    return null;
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
};

app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "uploads"), {
    setHeaders: (res, filePath) => {
      // The dev client runs on a different origin (Vite :5173); helmet's
      // default CORP same-origin would block <img> loads from there.
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      if (!path.extname(filePath)) {
        const type = sniffContentType(filePath);
        if (type) res.setHeader("Content-Type", type);
      }
    },
  })
);

// Routes — /api/v1 is canonical; /api kept as alias for the existing client
app.use("/api/v1", apiRouter);
app.use("/api", apiRouter);

app.get("/", (req, res) => {
  res.json({ success: true, message: "Communo API is running" });
});

// Health probe for platform checks (Render health checks, uptime monitors)
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Errors
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

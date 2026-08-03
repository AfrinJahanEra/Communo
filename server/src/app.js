import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
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

// Routes — /api/v1 is canonical; /api kept as alias for the existing client
app.use("/api/v1", apiRouter);
app.use("/api", apiRouter);

app.get("/", (req, res) => {
  res.json({ success: true, message: "CodeCord API is running" });
});

// Errors
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

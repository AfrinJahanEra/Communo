import http from "http";
import env from "./config/env.js";
import app from "./app.js";
import connectDB, { disconnectDB } from "./config/db.js";
import logger from "./utils/logger.js";
import { initSocket } from "./sockets/index.js";

const server = http.createServer(app);

// Real-time gateway (Phase 5): rooms, typing, live message events
initSocket(server);

const start = async () => {
  await connectDB();
  server.listen(env.PORT, () => {
    logger.info(`Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  });
};

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});

start();

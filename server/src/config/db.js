import dns from "dns";
import mongoose from "mongoose";
import env from "./env.js";
import logger from "../utils/logger.js";

const connectDB = async () => {
  mongoose.set("autoIndex", !env.isProduction);
  try {
    const conn = await mongoose.connect(env.MONGO_URI);
    logger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    // Some local DNS resolvers refuse SRV lookups required by mongodb+srv;
    // retry once with public resolvers before giving up
    if (error.code === "ECONNREFUSED" && error.syscall === "querySrv") {
      logger.warn("Local DNS refused SRV lookup, retrying with public DNS resolvers");
      dns.setServers(["8.8.8.8", "1.1.1.1"]);
      try {
        const conn = await mongoose.connect(env.MONGO_URI);
        logger.info(`MongoDB connected via public DNS: ${conn.connection.host}`);
        return;
      } catch (retryError) {
        logger.error(`MongoDB connection error: ${retryError.message}`);
        process.exit(1);
      }
    }
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  logger.info("MongoDB disconnected");
};

export default connectDB;

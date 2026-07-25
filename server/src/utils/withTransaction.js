import mongoose from "mongoose";

/**
 * Runs `fn(session)` inside a MongoDB transaction so multi-document
 * writes (e.g. server + default role + owner membership) stay atomic.
 */
export const withTransaction = async (fn) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

import mongoose from "mongoose";
import env from "../src/config/env.js";
import User from "../src/models/User.js";

const run = async () => {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(env.MONGO_URI);
  console.log(`Connected to database: ${mongoose.connection.name}\n`);

  const total = await User.countDocuments();
  const needsBackfill = await User.countDocuments({ isEmailVerified: { $exists: false } });

  console.log(`Total users:        ${total}`);
  console.log(`Missing the field:  ${needsBackfill}`);

  if (needsBackfill === 0) {
    console.log("\nNothing to do. Every user already has isEmailVerified set.");
    await mongoose.disconnect();
    return;
  }

  const result = await User.updateMany(
    { isEmailVerified: { $exists: false } },
    { $set: { isEmailVerified: true, authProvider: "local" } }
  );

  console.log(`\nUpdated ${result.modifiedCount} user(s).`);

  const remaining = await User.countDocuments({ isEmailVerified: { $exists: false } });
  console.log(`Remaining without the field: ${remaining}`);
  console.log("\nDone. These users can log in normally.");

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("\nMigration failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
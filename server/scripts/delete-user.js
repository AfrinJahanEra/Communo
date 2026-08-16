import connectDB, { disconnectDB } from "../src/config/db.js";
import User from "../src/models/User.js";
import VerificationToken from "../src/models/VerificationToken.js";
import RefreshToken from "../src/models/RefreshToken.js";

const email = (process.argv[2] || "").trim().toLowerCase();
if (!email) {
  console.error("Usage: node scripts/delete-user.js <email>");
  process.exit(1);
}

const run = async () => {
  await connectDB();

  const user = await User.findOne({ email });
  if (!user) {
    console.log(`No user found with email ${email}.`);
    await disconnectDB();
    return;
  }

  // Remove the account plus anything keyed to it that could block a
  // clean re-registration (pending verification links, live sessions).
  const [tokens, refresh] = await Promise.all([
    VerificationToken.deleteMany({ userId: user._id }),
    RefreshToken.deleteMany({ userId: user._id }),
  ]);
  await User.deleteOne({ _id: user._id });

  console.log(`Deleted user: ${user.email} (username: ${user.username})`);
  console.log(`Removed ${tokens.deletedCount} verification token(s) and ${refresh.deletedCount} refresh token(s).`);
  console.log("This email can now register again.");

  await disconnectDB();
};

run().catch(async (error) => {
  console.error("Delete failed:", error.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});

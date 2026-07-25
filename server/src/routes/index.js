import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import serverRoutes from "./server.routes.js";
import inviteRoutes from "./invite.routes.js";
import channelRoutes from "./channel.routes.js";
import threadRoutes from "./thread.routes.js";
import messageRoutes from "./message.routes.js";
import friendRoutes from "./friend.routes.js";
import dmRoutes from "./dm.routes.js";
import aiRoutes from "./ai.routes.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ success: true, message: "CodeCord API is running" });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/servers", serverRoutes);
router.use("/invites", inviteRoutes);
router.use("/channels", channelRoutes);
router.use("/threads", threadRoutes);
router.use("/messages", messageRoutes);
router.use("/friends", friendRoutes);
router.use("/dms", dmRoutes);
router.use("/ai", aiRoutes);

export default router;

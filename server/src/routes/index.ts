import { Hono } from "hono";
import { requireUser, type AuthEnv } from "../middleware/auth.ts";
import { assistantRoutes } from "./assistant.ts";
import { conversationsRoutes } from "./conversations.ts";
import { messagesRoutes } from "./messages.ts";
import { presenceRoutes } from "./presence.ts";
import { talkRoutes } from "./talk.ts";
import { usersRoutes } from "./users.ts";

// Everything under /api needs a signed-in user.
export const api = new Hono<AuthEnv>()
  .use(requireUser)
  .route("/", usersRoutes)
  .route("/", presenceRoutes)
  .route("/", talkRoutes)
  .route("/conversations", conversationsRoutes)
  .route("/conversations", messagesRoutes)
  .route("/assistant", assistantRoutes);

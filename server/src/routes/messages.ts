import { Hono } from "hono";
import * as messages from "../controllers/messages.ts";
import type { AuthEnv } from "../middleware/auth.ts";

export const messagesRoutes = new Hono<AuthEnv>().get(
  "/:id/messages",
  async (c) => {
    const { before, limit } = c.req.query();
    return c.json(
      await messages.list(c.req.param("id"), c.get("userId"), {
        before,
        limit: Number(limit) || undefined,
      }),
    );
  },
);

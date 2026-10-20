import { Hono } from "hono";
import * as conversations from "../controllers/conversations.ts";
import { requireString } from "../errors.ts";
import type { AuthEnv } from "../middleware/auth.ts";

export const conversationsRoutes = new Hono<AuthEnv>()
  .get("/", async (c) => c.json(await conversations.list(c.get("userId"))))
  .get("/:id", async (c) =>
    c.json(await conversations.get(c.req.param("id"), c.get("userId"))),
  )
  .post("/invites", async (c) => {
    const body = await c.req.json();
    const toUserId = requireString(body.userId, "userId");
    return c.json(await conversations.invite(c.get("userId"), toUserId), 201);
  })
  .post("/invites/:inviteId/accept", async (c) =>
    c.json(
      await conversations.accept(c.req.param("inviteId"), c.get("userId")),
      201,
    ),
  )
  .post("/invites/:inviteId/decline", (c) => {
    conversations.decline(c.req.param("inviteId"), c.get("userId"));
    return c.body(null, 204);
  });

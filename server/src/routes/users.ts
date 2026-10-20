import { Hono } from "hono";
import * as users from "../controllers/users.ts";
import { requireString } from "../errors.ts";
import type { AuthEnv } from "../middleware/auth.ts";

export const usersRoutes = new Hono<AuthEnv>()
  .get("/me", async (c) => c.json(await users.getMe(c.get("userId"))))
  .put("/me", async (c) => {
    const body = await c.req.json();
    const displayName = requireString(body.displayName, "displayName");
    return c.json(await users.updateMe(c.get("userId"), displayName));
  });

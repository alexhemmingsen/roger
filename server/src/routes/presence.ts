import { Hono } from "hono";
import { clientIp } from "../client-ip.ts";
import * as presence from "../controllers/presence.ts";
import type { AuthEnv } from "../middleware/auth.ts";

export const presenceRoutes = new Hono<AuthEnv>().get("/nearby", async (c) =>
  c.json(await presence.listNearby(c.get("userId"), clientIp(c))),
);

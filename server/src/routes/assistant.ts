import { Hono } from "hono";
import * as assistant from "../controllers/assistant.ts";
import { requireString } from "../errors.ts";
import type { AuthEnv } from "../middleware/auth.ts";

export const assistantRoutes = new Hono<AuthEnv>().post("/ask", async (c) => {
  const body = await c.req.json();
  const question = requireString(body.question, "question");
  return c.json(await assistant.ask(c.get("userId"), question));
});

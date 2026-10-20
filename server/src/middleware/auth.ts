import { verifyAuth } from "@supabase/server/core";
import { createMiddleware } from "hono/factory";

export type AuthEnv = { Variables: { userId: string } };

// Expects "Authorization: Bearer <Supabase access token>".
export const requireUser = createMiddleware<AuthEnv>(async (c, next) => {
  const { data, error } = await verifyAuth(c.req.raw, { auth: "user" });
  if (error || !data.userClaims) {
    return c.json({ error: error?.message ?? "Unauthorized" }, 401);
  }
  c.set("userId", data.userClaims.id);
  await next();
});

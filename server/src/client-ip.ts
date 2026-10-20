import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";

// Behind a hosting proxy the real client IP is the first entry in X-Forwarded-For.
export function clientIp(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || getConnInfo(c).remote.address || "";
}

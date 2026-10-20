import { serve, type ServerType } from "@hono/node-server";
import { Hono } from "hono";
import { WebSocketServer } from "ws";
import { AppError } from "./errors.ts";
import { api } from "./routes/index.ts";
import { supabaseAdmin } from "./supabase.ts";

export const app = new Hono();

app.get("/health", async (c) => {
  const { error } = await supabaseAdmin
    .from("users")
    .select("id", { head: true })
    .limit(1);
  if (error) return c.json({ ok: false, supabase: error.message }, 503);
  return c.json({ ok: true });
});

app.route("/api", api);

app.onError((error, c) => {
  if (error instanceof AppError) {
    return c.json({ error: error.message }, error.status);
  }
  if (error instanceof SyntaxError) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  console.error(error);
  return c.json({ error: "Internal server error" }, 500);
});

export function startServer(port: number): ServerType {
  return serve({
    fetch: app.fetch,
    port,
    websocket: { server: new WebSocketServer({ noServer: true }) },
  });
}

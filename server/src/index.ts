import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { WebSocketServer } from "ws";
import { AppError } from "./errors.ts";
import { api } from "./routes/index.ts";
import { supabaseAdmin } from "./supabase.ts";

const port = Number(process.env.PORT ?? 3000);
const app = new Hono();

app.get("/health", async (c) => {
  // Listing buckets needs a valid URL and secret key, so it doubles as a Supabase connection check.
  const { error } = await supabaseAdmin.storage.listBuckets();
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

serve(
  {
    fetch: app.fetch,
    port,
    websocket: { server: new WebSocketServer({ noServer: true }) },
  },
  (info) => {
    console.log(`Server listening on http://localhost:${info.port}`);
  },
);

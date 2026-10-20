import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { supabaseAdmin } from "./supabase.ts";

const port = Number(process.env.PORT ?? 3000);
const app = new Hono();

app.get("/health", async (c) => {
  // Listing buckets needs a valid URL and secret key, so it doubles as a Supabase connection check.
  const { error } = await supabaseAdmin.storage.listBuckets();
  if (error) return c.json({ ok: false, supabase: error.message }, 503);
  return c.json({ ok: true });
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server listening on http://localhost:${info.port}`);
});

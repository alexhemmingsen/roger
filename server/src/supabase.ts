import { createAdminClient } from "@supabase/server/core";
import type { Database } from "./database.types.ts";

// Reads SUPABASE_URL and SUPABASE_SECRET_KEY from the environment and throws at startup if either is missing.
// Bypasses row level security, so it stays on the server.
export const supabaseAdmin = createAdminClient<Database>();

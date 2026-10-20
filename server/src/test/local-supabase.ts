import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import type { TestProject } from "vitest/node";

export type LocalSupabase = {
  url: string;
  publishableKey: string;
  secretKey: string;
};

declare module "vitest" {
  export interface ProvidedContext {
    supabase: LocalSupabase;
  }
}

const SIGNING_KEYS = "supabase/signing_keys.json";

function supabase(...args: string[]): string {
  return execFileSync("supabase", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function status(): Record<string, string> | null {
  try {
    return JSON.parse(supabase("status", "-o", "json"));
  } catch {
    return null;
  }
}

// Starts the local Supabase stack if it isn't running, and hands its URL and keys to the tests.
export default function setup(project: TestProject) {
  // Local Auth needs an asymmetric key so the server can verify tokens via JWKS, like in production.
  // The CLI writes the key into the file set in config.toml, but only if that file exists.
  if (!existsSync(SIGNING_KEYS)) {
    writeFileSync(SIGNING_KEYS, "[]");
    supabase("gen", "signing-key", "--algorithm", "ES256");
  }

  let local = status();
  if (!local) {
    execFileSync("supabase", ["start"], { stdio: "inherit" });
    local = status();
  }
  if (!local?.API_URL || !local.PUBLISHABLE_KEY || !local.SECRET_KEY) {
    throw new Error(`Local Supabase is not running: ${JSON.stringify(local)}`);
  }

  project.provide("supabase", {
    url: local.API_URL,
    publishableKey: local.PUBLISHABLE_KEY,
    secretKey: local.SECRET_KEY,
  });
}

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.integration.test.ts"],
    globalSetup: ["src/test/local-supabase.ts"],
    testTimeout: 15_000,
  },
});

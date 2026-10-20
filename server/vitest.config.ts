import { configDefaults, defineConfig } from "vitest/config";

// Unit tests only. Integration tests run with vitest.integration.config.ts.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "**/*.integration.test.ts"],
  },
});

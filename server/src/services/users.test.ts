import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "../test/fake-supabase.ts";
import { getUser, getUsers, upsertUser } from "./users.ts";

vi.mock("../supabase.ts", async () => {
  const { fakeSupabase } = await import("../test/fake-supabase.ts");
  return { supabaseAdmin: fakeSupabase.client };
});

const alex = {
  id: "user-1",
  display_name: "Alex",
  created_at: "2026-10-20T10:00:00Z",
};
const sam = {
  id: "user-2",
  display_name: "Sam",
  created_at: "2026-10-20T10:05:00Z",
};

beforeEach(() => fakeSupabase.reset());

describe("upsertUser", () => {
  it("creates or renames the user and returns the saved row", async () => {
    fakeSupabase.respond({ data: alex });

    await expect(upsertUser("user-1", "Alex")).resolves.toEqual(alex);
    expect(fakeSupabase.queries).toEqual([
      {
        table: "users",
        calls: [
          ["upsert", { id: "user-1", display_name: "Alex" }],
          ["select"],
          ["single"],
          ["throwOnError"],
        ],
      },
    ]);
  });

  it("throws when Supabase returns an error", async () => {
    fakeSupabase.respond({
      error: { message: "violates check constraint", code: "23514" },
    });

    await expect(upsertUser("user-1", "x".repeat(41))).rejects.toMatchObject({
      code: "23514",
    });
  });
});

describe("getUser", () => {
  it("returns the user with that id", async () => {
    fakeSupabase.respond({ data: alex });

    await expect(getUser("user-1")).resolves.toEqual(alex);
    expect(fakeSupabase.queries[0]).toEqual({
      table: "users",
      calls: [
        ["select"],
        ["eq", "id", "user-1"],
        ["maybeSingle"],
        ["throwOnError"],
      ],
    });
  });

  it("returns null when the user does not exist", async () => {
    fakeSupabase.respond({ data: null });

    await expect(getUser("missing")).resolves.toBeNull();
  });
});

describe("getUsers", () => {
  it("returns all users with the given ids in one query", async () => {
    fakeSupabase.respond({ data: [alex, sam] });

    await expect(getUsers(["user-1", "user-2"])).resolves.toEqual([alex, sam]);
    expect(fakeSupabase.queries).toEqual([
      {
        table: "users",
        calls: [
          ["select"],
          ["in", "id", ["user-1", "user-2"]],
          ["throwOnError"],
        ],
      },
    ]);
  });

  it("returns an empty list without querying when given no ids", async () => {
    await expect(getUsers([])).resolves.toEqual([]);
    expect(fakeSupabase.queries).toEqual([]);
  });
});

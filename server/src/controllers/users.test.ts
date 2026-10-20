import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUser, upsertUser } from "../services/users.ts";
import { getMe, updateMe } from "./users.ts";

vi.mock("../supabase.ts", () => ({ supabaseAdmin: {} }));
vi.mock("../services/users.ts");

const alex = {
  id: "user-1",
  display_name: "Alex",
  created_at: "2026-10-20T10:00:00Z",
};

beforeEach(() => vi.resetAllMocks());

describe("getMe", () => {
  it("returns the signed-in user", async () => {
    vi.mocked(getUser).mockResolvedValue(alex);

    await expect(getMe("user-1")).resolves.toEqual(alex);
  });

  it("fails with 404 when the user hasn't set a display name yet", async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    await expect(getMe("user-1")).rejects.toMatchObject({ status: 404 });
  });
});

describe("updateMe", () => {
  it("saves the display name", async () => {
    vi.mocked(upsertUser).mockResolvedValue(alex);

    await expect(updateMe("user-1", "Alex")).resolves.toEqual(alex);
    expect(upsertUser).toHaveBeenCalledWith("user-1", "Alex");
  });

  it("rejects names over 40 characters without saving", async () => {
    expect(() => updateMe("user-1", "x".repeat(41))).toThrow(
      expect.objectContaining({ status: 400 }),
    );
    expect(upsertUser).not.toHaveBeenCalled();
  });
});

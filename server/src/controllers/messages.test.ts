import { beforeEach, describe, expect, it, vi } from "vitest";
import { isMember } from "../services/conversations.ts";
import { listMessages } from "../services/messages.ts";
import { list } from "./messages.ts";

vi.mock("../supabase.ts", () => ({ supabaseAdmin: {} }));
vi.mock("../services/conversations.ts");
vi.mock("../services/messages.ts");

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isMember).mockResolvedValue(true);
  vi.mocked(listMessages).mockResolvedValue([]);
});

describe("list", () => {
  it("returns the latest 50 messages by default", async () => {
    await list("conv-1", "user-1");

    expect(listMessages).toHaveBeenCalledWith("conv-1", {
      before: undefined,
      limit: 50,
    });
  });

  it("passes on `before` and caps the limit at 200", async () => {
    await list("conv-1", "user-1", {
      before: "2026-10-20T11:00:00Z",
      limit: 1000,
    });

    expect(listMessages).toHaveBeenCalledWith("conv-1", {
      before: "2026-10-20T11:00:00Z",
      limit: 200,
    });
  });

  it("fails with 404 for non-members without loading messages", async () => {
    vi.mocked(isMember).mockResolvedValue(false);

    await expect(list("conv-1", "user-3")).rejects.toMatchObject({
      status: 404,
    });
    expect(listMessages).not.toHaveBeenCalled();
  });
});

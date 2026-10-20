import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createConversation,
  getConversation,
  listConversationsForUser,
} from "../services/conversations.ts";
import { getUser } from "../services/users.ts";
import { accept, decline, get, invite, list } from "./conversations.ts";
import { sameNetwork, sendEvent } from "./presence.ts";

vi.mock("../supabase.ts", () => ({ supabaseAdmin: {} }));
vi.mock("../services/conversations.ts");
vi.mock("../services/users.ts");
vi.mock("./presence.ts");

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
const conversation = {
  id: "conv-1",
  name: null,
  created_by: "user-1",
  created_at: "2026-10-20T11:00:00Z",
  members: [alex, sam],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(sameNetwork).mockReturnValue(true);
  vi.mocked(getUser).mockResolvedValue(alex);
  vi.mocked(createConversation).mockResolvedValue(conversation);
});

describe("invite", () => {
  it("sends the invite to the other user and returns it", async () => {
    const result = await invite("user-1", "user-2");

    expect(result).toEqual({
      id: expect.any(String),
      fromUserId: "user-1",
      toUserId: "user-2",
    });
    expect(sendEvent).toHaveBeenCalledWith("user-2", {
      type: "invite",
      inviteId: result.id,
      from: alex,
    });
  });

  it("rejects inviting yourself", async () => {
    await expect(invite("user-1", "user-1")).rejects.toMatchObject({
      status: 400,
    });
  });

  it("rejects users who aren't online on the same network", async () => {
    vi.mocked(sameNetwork).mockReturnValue(false);

    await expect(invite("user-1", "user-2")).rejects.toMatchObject({
      status: 409,
    });
    expect(sendEvent).not.toHaveBeenCalled();
  });
});

describe("accept", () => {
  it("creates the conversation, tells the inviter, and returns it", async () => {
    const { id } = await invite("user-1", "user-2");

    await expect(accept(id, "user-2")).resolves.toEqual(conversation);
    expect(createConversation).toHaveBeenCalledWith({
      createdBy: "user-1",
      memberIds: ["user-2"],
    });
    expect(sendEvent).toHaveBeenCalledWith("user-1", {
      type: "invite_accepted",
      inviteId: id,
      conversation,
    });
  });

  it("only lets the invited user accept", async () => {
    const { id } = await invite("user-1", "user-2");

    await expect(accept(id, "user-3")).rejects.toMatchObject({ status: 404 });
    expect(createConversation).not.toHaveBeenCalled();
  });

  it("can only be used once", async () => {
    const { id } = await invite("user-1", "user-2");
    await accept(id, "user-2");

    await expect(accept(id, "user-2")).rejects.toMatchObject({ status: 404 });
  });
});

describe("decline", () => {
  it("tells the inviter and removes the invite", async () => {
    const { id } = await invite("user-1", "user-2");

    decline(id, "user-2");

    expect(sendEvent).toHaveBeenCalledWith("user-1", {
      type: "invite_declined",
      inviteId: id,
    });
    await expect(accept(id, "user-2")).rejects.toMatchObject({ status: 404 });
  });
});

describe("list", () => {
  it("returns the user's conversations", async () => {
    vi.mocked(listConversationsForUser).mockResolvedValue([conversation]);

    await expect(list("user-1")).resolves.toEqual([conversation]);
  });
});

describe("get", () => {
  it("returns the conversation to a member", async () => {
    vi.mocked(getConversation).mockResolvedValue(conversation);

    await expect(get("conv-1", "user-2")).resolves.toEqual(conversation);
  });

  it("fails with 404 for non-members and missing conversations", async () => {
    vi.mocked(getConversation)
      .mockResolvedValueOnce(conversation)
      .mockResolvedValueOnce(null);

    await expect(get("conv-1", "user-3")).rejects.toMatchObject({
      status: 404,
    });
    await expect(get("missing", "user-1")).rejects.toMatchObject({
      status: 404,
    });
  });
});

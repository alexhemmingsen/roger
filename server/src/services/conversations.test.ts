import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "../test/fake-supabase.ts";
import {
  createConversation,
  getConversation,
  isMember,
  listConversationsForUser,
} from "./conversations.ts";

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

const conversation = {
  id: "conv-1",
  name: null,
  created_by: "user-1",
  created_at: "2026-10-20T11:00:00Z",
};
const olderConversation = {
  id: "conv-2",
  name: "Night shift",
  created_by: "user-2",
  created_at: "2026-10-19T22:00:00Z",
};

// What Supabase returns for a conversation selected with its members embedded.
const conversationRow = {
  ...conversation,
  conversation_members: [{ user: alex }, { user: sam }],
};

beforeEach(() => fakeSupabase.reset());

describe("createConversation", () => {
  it("creates the conversation, adds each member once with the creator first, and returns it with members", async () => {
    fakeSupabase.respond({ data: conversation }, {}, { data: conversationRow });

    const result = await createConversation({
      createdBy: "user-1",
      memberIds: ["user-2", "user-1"],
    });

    expect(result).toEqual({ ...conversation, members: [alex, sam] });
    const [insertConversation, insertMembers, reload] = fakeSupabase.queries;
    expect(insertConversation).toEqual({
      table: "conversations",
      calls: [
        ["insert", { created_by: "user-1", name: null }],
        ["select"],
        ["single"],
        ["throwOnError"],
      ],
    });
    expect(insertMembers).toEqual({
      table: "conversation_members",
      calls: [
        [
          "insert",
          [
            { conversation_id: "conv-1", user_id: "user-1" },
            { conversation_id: "conv-1", user_id: "user-2" },
          ],
        ],
      ],
    });
    expect(reload?.table).toBe("conversations");
    expect(reload?.calls).toContainEqual(["eq", "id", "conv-1"]);
  });

  it("saves the name when one is given", async () => {
    fakeSupabase.respond(
      { data: { ...conversation, name: "Ward 3" } },
      {},
      { data: conversationRow },
    );

    await createConversation({
      createdBy: "user-1",
      memberIds: ["user-2"],
      name: "Ward 3",
    });

    expect(fakeSupabase.queries[0]?.calls[0]).toEqual([
      "insert",
      { created_by: "user-1", name: "Ward 3" },
    ]);
  });

  it("deletes the conversation again and throws if adding the members fails", async () => {
    const error = { message: "violates foreign key constraint", code: "23503" };
    fakeSupabase.respond({ data: conversation }, { error }, {});

    await expect(
      createConversation({ createdBy: "user-1", memberIds: ["no-such-user"] }),
    ).rejects.toBe(error);
    expect(fakeSupabase.queries).toHaveLength(3);
    expect(fakeSupabase.queries[2]).toEqual({
      table: "conversations",
      calls: [["delete"], ["eq", "id", "conv-1"]],
    });
  });

  it("does not add members if creating the conversation fails", async () => {
    fakeSupabase.respond({ error: { message: "connection lost" } });

    await expect(
      createConversation({ createdBy: "user-1", memberIds: ["user-2"] }),
    ).rejects.toMatchObject({
      message: "connection lost",
    });
    expect(fakeSupabase.queries).toHaveLength(1);
  });

  it("throws if the new conversation cannot be read back", async () => {
    fakeSupabase.respond({ data: conversation }, {}, { data: null });

    await expect(
      createConversation({ createdBy: "user-1", memberIds: ["user-2"] }),
    ).rejects.toThrow(
      "Conversation conv-1 disappeared right after it was created",
    );
  });
});

describe("getConversation", () => {
  it("returns the conversation with its members", async () => {
    fakeSupabase.respond({ data: conversationRow });

    await expect(getConversation("conv-1")).resolves.toEqual({
      ...conversation,
      members: [alex, sam],
    });
    expect(fakeSupabase.queries[0]).toEqual({
      table: "conversations",
      calls: [
        ["select", "*, conversation_members(user:users(*))"],
        ["eq", "id", "conv-1"],
        ["maybeSingle"],
        ["throwOnError"],
      ],
    });
  });

  it("leaves out members whose user row is missing", async () => {
    fakeSupabase.respond({
      data: {
        ...conversation,
        conversation_members: [{ user: alex }, { user: null }],
      },
    });

    const result = await getConversation("conv-1");

    expect(result?.members).toEqual([alex]);
  });

  it("returns null when the conversation does not exist", async () => {
    fakeSupabase.respond({ data: null });

    await expect(getConversation("missing")).resolves.toBeNull();
  });
});

describe("listConversationsForUser", () => {
  it("returns the user's conversations with members, newest first", async () => {
    fakeSupabase.respond(
      { data: [{ conversation_id: "conv-1" }, { conversation_id: "conv-2" }] },
      {
        data: [
          conversationRow,
          { ...olderConversation, conversation_members: [{ user: sam }] },
        ],
      },
    );

    const result = await listConversationsForUser("user-1");

    expect(result).toEqual([
      { ...conversation, members: [alex, sam] },
      { ...olderConversation, members: [sam] },
    ]);
    expect(fakeSupabase.queries).toEqual([
      {
        table: "conversation_members",
        calls: [
          ["select", "conversation_id"],
          ["eq", "user_id", "user-1"],
          ["throwOnError"],
        ],
      },
      {
        table: "conversations",
        calls: [
          ["select", "*, conversation_members(user:users(*))"],
          ["in", "id", ["conv-1", "conv-2"]],
          ["order", "created_at", { ascending: false }],
          ["throwOnError"],
        ],
      },
    ]);
  });

  it("returns an empty list without a second query when the user is in no conversations", async () => {
    fakeSupabase.respond({ data: [] });

    await expect(listConversationsForUser("user-1")).resolves.toEqual([]);
    expect(fakeSupabase.queries).toHaveLength(1);
  });
});

describe("isMember", () => {
  it("returns true when the user is a member", async () => {
    fakeSupabase.respond({ data: { user_id: "user-1" } });

    await expect(isMember("conv-1", "user-1")).resolves.toBe(true);
    expect(fakeSupabase.queries[0]).toEqual({
      table: "conversation_members",
      calls: [
        ["select", "user_id"],
        ["eq", "conversation_id", "conv-1"],
        ["eq", "user_id", "user-1"],
        ["maybeSingle"],
        ["throwOnError"],
      ],
    });
  });

  it("returns false when the user is not a member", async () => {
    fakeSupabase.respond({ data: null });

    await expect(isMember("conv-1", "user-3")).resolves.toBe(false);
  });
});

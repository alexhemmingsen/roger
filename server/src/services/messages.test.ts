import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "../test/fake-supabase.ts";
import {
  createMessage,
  listMessages,
  listRecentMessages,
  setTranscript,
} from "./messages.ts";

vi.mock("../supabase.ts", async () => {
  const { fakeSupabase } = await import("../test/fake-supabase.ts");
  return { supabaseAdmin: fakeSupabase.client };
});

const message = {
  id: "msg-1",
  conversation_id: "conv-1",
  sender_id: "user-1",
  transcript: null,
  duration_ms: 3200,
  created_at: "2026-10-20T11:00:00Z",
};

beforeEach(() => fakeSupabase.reset());

describe("createMessage", () => {
  it("saves the transmission without a transcript and returns the row", async () => {
    fakeSupabase.respond({ data: message });

    await expect(
      createMessage({
        conversationId: "conv-1",
        senderId: "user-1",
        durationMs: 3200,
      }),
    ).resolves.toEqual(message);
    expect(fakeSupabase.queries[0]).toEqual({
      table: "messages",
      calls: [
        [
          "insert",
          { conversation_id: "conv-1", sender_id: "user-1", duration_ms: 3200 },
        ],
        ["select"],
        ["single"],
        ["throwOnError"],
      ],
    });
  });

  it("rounds the duration to whole milliseconds, because the column is an integer", async () => {
    fakeSupabase.respond({ data: message });

    await createMessage({
      conversationId: "conv-1",
      senderId: "user-1",
      durationMs: 3200.6,
    });

    expect(fakeSupabase.queries[0]?.calls[0]).toEqual([
      "insert",
      { conversation_id: "conv-1", sender_id: "user-1", duration_ms: 3201 },
    ]);
  });

  it("throws when Supabase returns an error", async () => {
    fakeSupabase.respond({
      error: { message: "violates foreign key constraint", code: "23503" },
    });

    await expect(
      createMessage({
        conversationId: "no-such-conversation",
        senderId: "user-1",
        durationMs: 1000,
      }),
    ).rejects.toMatchObject({ code: "23503" });
  });
});

describe("setTranscript", () => {
  it("updates the transcript on that message only", async () => {
    fakeSupabase.respond({});

    await expect(
      setTranscript("msg-1", "Room 12 needs fresh sheets"),
    ).resolves.toBeUndefined();
    expect(fakeSupabase.queries[0]).toEqual({
      table: "messages",
      calls: [
        ["update", { transcript: "Room 12 needs fresh sheets" }],
        ["eq", "id", "msg-1"],
        ["throwOnError"],
      ],
    });
  });

  it("throws when Supabase returns an error", async () => {
    fakeSupabase.respond({ error: { message: "connection lost" } });

    await expect(setTranscript("msg-1", "hello")).rejects.toMatchObject({
      message: "connection lost",
    });
  });
});

describe("listMessages", () => {
  const older = { ...message, id: "msg-1", created_at: "2026-10-20T11:00:00Z" };
  const newer = { ...message, id: "msg-2", created_at: "2026-10-20T11:05:00Z" };

  it("fetches the latest 50 messages with their sender and returns them oldest first", async () => {
    // Supabase returns newest first, because the query sorts descending to get the latest ones.
    fakeSupabase.respond({ data: [newer, older] });

    await expect(listMessages("conv-1")).resolves.toEqual([older, newer]);
    expect(fakeSupabase.queries[0]).toEqual({
      table: "messages",
      calls: [
        ["select", "*, sender:users(id, display_name)"],
        ["eq", "conversation_id", "conv-1"],
        ["order", "created_at", { ascending: false }],
        ["limit", 50],
        ["throwOnError"],
      ],
    });
  });

  it("pages back from `before` and respects a custom limit", async () => {
    fakeSupabase.respond({ data: [] });

    await listMessages("conv-1", { before: "2026-10-20T11:05:00Z", limit: 10 });

    const calls = fakeSupabase.queries[0]?.calls;
    expect(calls).toContainEqual(["lt", "created_at", "2026-10-20T11:05:00Z"]);
    expect(calls).toContainEqual(["limit", 10]);
  });
});

describe("listRecentMessages", () => {
  const older = { ...message, id: "msg-1", created_at: "2026-10-20T11:00:00Z" };
  const newer = {
    ...message,
    id: "msg-2",
    conversation_id: "conv-2",
    created_at: "2026-10-20T11:05:00Z",
  };

  it("fetches the latest messages across all the conversations in one query, oldest first", async () => {
    fakeSupabase.respond({ data: [newer, older] });

    await expect(
      listRecentMessages(["conv-1", "conv-2"], 200),
    ).resolves.toEqual([older, newer]);
    expect(fakeSupabase.queries).toEqual([
      {
        table: "messages",
        calls: [
          ["select", "*, sender:users(id, display_name)"],
          ["in", "conversation_id", ["conv-1", "conv-2"]],
          ["order", "created_at", { ascending: false }],
          ["limit", 200],
          ["throwOnError"],
        ],
      },
    ]);
  });

  it("returns an empty list without querying when given no conversations", async () => {
    await expect(listRecentMessages([], 200)).resolves.toEqual([]);
    expect(fakeSupabase.queries).toEqual([]);
  });
});

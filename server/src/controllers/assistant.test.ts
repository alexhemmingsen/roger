import { beforeEach, describe, expect, it, vi } from "vitest";
import { listConversationsForUser } from "../services/conversations.ts";
import { complete } from "../services/llm.ts";
import { listRecentMessages } from "../services/messages.ts";
import { ask } from "./assistant.ts";

vi.mock("../supabase.ts", () => ({ supabaseAdmin: {} }));
vi.mock("../services/conversations.ts");
vi.mock("../services/llm.ts");
vi.mock("../services/messages.ts");

const user = (id: string, display_name: string) => ({
  id,
  display_name,
  created_at: "2026-10-20T10:00:00Z",
});
const alex = user("user-1", "Alex");
const sam = user("user-2", "Sam");
const kim = user("user-3", "Kim");

const conversation = (
  id: string,
  name: string | null,
  members = [alex, sam],
) => ({
  id,
  name,
  created_by: "user-1",
  created_at: "2026-10-20T10:00:00Z",
  members,
});

function message(
  conversation_id: string,
  transcript: string | null,
  sender: typeof alex | null,
  created_at: string,
) {
  return {
    id: `msg-${created_at}`,
    conversation_id,
    sender_id: sender?.id ?? null,
    transcript,
    duration_ms: 2000,
    created_at,
    sender: sender
      ? { id: sender.id, display_name: sender.display_name }
      : null,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(complete).mockResolvedValue("Sam said room 12 needs fresh sheets.");
});

describe("ask", () => {
  it("answers from the transcripts of all the user's conversations", async () => {
    vi.mocked(listConversationsForUser).mockResolvedValue([
      conversation("conv-1", "Night shift"),
      conversation("conv-2", null, [alex, kim]),
    ]);
    vi.mocked(listRecentMessages).mockResolvedValue([
      message(
        "conv-1",
        "Room 12 needs fresh sheets",
        sam,
        "2026-10-20T11:00:00Z",
      ),
      message("conv-2", null, kim, "2026-10-20T11:01:00Z"),
      message("conv-2", "Pharmacy closes at six", kim, "2026-10-20T11:02:00Z"),
      message("conv-1", "On my way", null, "2026-10-20T11:03:00Z"),
    ]);

    const result = await ask("user-1", "What did Sam say about room 12?");

    expect(result).toEqual({ answer: "Sam said room 12 needs fresh sheets." });
    expect(listConversationsForUser).toHaveBeenCalledWith("user-1");
    expect(listRecentMessages).toHaveBeenCalledWith(["conv-1", "conv-2"], 200);
    expect(vi.mocked(complete).mock.calls[0]![0].prompt).toBe(
      "The person asking is Alex.\n\n" +
        "Transcripts:\n" +
        "[2026-10-20T11:00:00Z] [Night shift] Sam: Room 12 needs fresh sheets\n" +
        "[2026-10-20T11:02:00Z] [Alex, Kim] Kim: Pharmacy closes at six\n" +
        "[2026-10-20T11:03:00Z] [Night shift] Unknown: On my way\n\n" +
        "Question: What did Sam say about room 12?",
    );
  });

  it("tells the LLM when the user has no messages yet", async () => {
    vi.mocked(listConversationsForUser).mockResolvedValue([]);
    vi.mocked(listRecentMessages).mockResolvedValue([]);

    const result = await ask("user-1", "Anything new?");

    expect(result.answer).toBeDefined();
    expect(listRecentMessages).toHaveBeenCalledWith([], 200);
    expect(vi.mocked(complete).mock.calls[0]![0].prompt).toContain(
      "(no messages yet)",
    );
  });
});

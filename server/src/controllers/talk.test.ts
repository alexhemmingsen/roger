import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getConversation } from "../services/conversations.ts";
import { createMessage } from "../services/messages.ts";
import { sendAudio, sendEvent } from "../services/connections.ts";
import { audio, start, stop } from "./talk.ts";
import { enqueue } from "./transcription.ts";

vi.mock("../supabase.ts", () => ({ supabaseAdmin: {} }));
vi.mock("../services/conversations.ts");
vi.mock("../services/messages.ts");
vi.mock("../services/connections.ts");
vi.mock("./transcription.ts");

// Talks live in memory between tests, so each test gets its own users and conversation.
let n = 0;
function setup() {
  n++;
  const speaker = `speaker-${n}`;
  const listener = `listener-${n}`;
  const conversationId = `conv-${n}`;
  const user = (id: string) => ({
    id,
    display_name: id,
    created_at: "2026-10-20T10:00:00Z",
  });
  vi.mocked(getConversation).mockResolvedValue({
    id: conversationId,
    name: null,
    created_by: speaker,
    created_at: "2026-10-20T10:00:00Z",
    members: [user(speaker), user(listener)],
  });
  return { speaker, listener, conversationId };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => vi.useRealTimers());

describe("start", () => {
  it("gives the speaker the conversation and tells the listeners", async () => {
    const { speaker, listener, conversationId } = setup();

    await start(speaker, conversationId);

    expect(sendEvent).toHaveBeenCalledWith(listener, {
      type: "talk_started",
      conversationId,
      speakerId: speaker,
    });
  });

  it("fails with 404 for non-members", async () => {
    const { conversationId } = setup();

    await expect(start("stranger", conversationId)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("fails with 409 while someone else is talking", async () => {
    const { speaker, listener, conversationId } = setup();
    await start(speaker, conversationId);

    await expect(start(listener, conversationId)).rejects.toMatchObject({
      status: 409,
    });
  });
});

describe("audio", () => {
  it("relays chunks from the speaker to the listeners", async () => {
    const { speaker, listener, conversationId } = setup();
    const chunk = new ArrayBuffer(640);
    await start(speaker, conversationId);

    audio(speaker, chunk);

    expect(sendAudio).toHaveBeenCalledWith(listener, chunk);
    expect(sendAudio).not.toHaveBeenCalledWith(speaker, chunk);
  });

  it("ignores audio from someone who isn't talking", () => {
    audio("not-talking", new ArrayBuffer(640));

    expect(sendAudio).not.toHaveBeenCalled();
  });
});

describe("stop", () => {
  it("saves the message, tells the listeners, and queues the audio for transcription", async () => {
    const { speaker, listener, conversationId } = setup();
    const message = {
      id: "msg-1",
      conversation_id: conversationId,
      sender_id: speaker,
      transcript: null,
      duration_ms: 3200,
      created_at: "2026-10-20T11:00:03Z",
    };
    vi.mocked(createMessage).mockResolvedValue(message);
    vi.setSystemTime(1_000);
    await start(speaker, conversationId);
    audio(speaker, new Uint8Array([1, 2]).buffer);
    audio(speaker, new Uint8Array([3, 4]).buffer);
    vi.setSystemTime(4_200);

    await expect(stop(speaker)).resolves.toEqual(message);

    expect(createMessage).toHaveBeenCalledWith({
      conversationId,
      senderId: speaker,
      durationMs: 3_200,
    });
    expect(sendEvent).toHaveBeenCalledWith(listener, {
      type: "talk_ended",
      conversationId,
      message,
    });
    expect(enqueue).toHaveBeenCalledWith({
      messageId: "msg-1",
      audio: Buffer.from([1, 2, 3, 4]),
    });
  });

  it("frees the conversation for the next speaker", async () => {
    const { speaker, listener, conversationId } = setup();
    await start(speaker, conversationId);
    await stop(speaker);

    await expect(start(listener, conversationId)).resolves.toBeUndefined();
  });

  it("saves nothing when no audio was sent", async () => {
    const { speaker, listener, conversationId } = setup();
    await start(speaker, conversationId);

    await expect(stop(speaker)).resolves.toBeNull();

    expect(createMessage).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
    expect(sendEvent).toHaveBeenCalledWith(listener, {
      type: "talk_ended",
      conversationId,
      message: null,
    });
  });

  it("does nothing when the user isn't talking", async () => {
    await expect(stop("not-talking")).resolves.toBeNull();
  });
});

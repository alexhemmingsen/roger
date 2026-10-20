import { AppError } from "../errors.ts";
import { getConversation } from "../services/conversations.ts";
import { createMessage } from "../services/messages.ts";
import type { Message } from "../types/messages.ts";
import * as presence from "./presence.ts";
import * as transcription from "./transcription.ts";

type Talk = {
  conversationId: string;
  speakerId: string;
  listenerIds: string[];
  startedAt: number;
  chunks: Buffer[];
};

// One speaker per conversation, keyed by conversation id.
const talks = new Map<string, Talk>();

function findTalk(userId: string): Talk | undefined {
  return [...talks.values()].find((t) => t.speakerId === userId);
}

export async function start(
  userId: string,
  conversationId: string,
): Promise<void> {
  const conversation = await getConversation(conversationId);
  if (!conversation?.members.some((m) => m.id === userId)) {
    throw new AppError(404, "Conversation not found");
  }
  if (talks.has(conversationId) || findTalk(userId)) {
    throw new AppError(409, "Someone is already talking");
  }

  const listenerIds = conversation.members
    .map((m) => m.id)
    .filter((id) => id !== userId);
  talks.set(conversationId, {
    conversationId,
    speakerId: userId,
    listenerIds,
    startedAt: Date.now(),
    chunks: [],
  });
  for (const id of listenerIds) {
    presence.sendEvent(id, {
      type: "talk_started",
      conversationId,
      speakerId: userId,
    });
  }
}

export function audio(userId: string, chunk: ArrayBuffer): void {
  const talk = findTalk(userId);
  if (!talk) return;
  talk.chunks.push(Buffer.from(chunk));
  for (const id of talk.listenerIds) presence.sendAudio(id, chunk);
}

export async function stop(userId: string): Promise<Message | null> {
  const talk = findTalk(userId);
  if (!talk) return null;
  talks.delete(talk.conversationId);

  if (talk.chunks.length === 0) {
    notifyEnded(talk, null);
    return null;
  }

  const message = await createMessage({
    conversationId: talk.conversationId,
    senderId: userId,
    durationMs: Date.now() - talk.startedAt,
  });
  notifyEnded(talk, message);
  void transcription.enqueue({
    messageId: message.id,
    audio: Buffer.concat(talk.chunks),
  });
  return message;
}

function notifyEnded(talk: Talk, message: Message | null): void {
  for (const id of talk.listenerIds) {
    presence.sendEvent(id, {
      type: "talk_ended",
      conversationId: talk.conversationId,
      message,
    });
  }
}

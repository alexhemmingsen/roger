// Mock data so the screens can be built and tried before they talk to the server.
// Replaced by real API calls in the next step.
import { useSyncExternalStore } from "react";
import type { Conversation, Message, User } from "./types";

export const ME_ID = "me";

function user(id: string, name: string): User {
  return { id, display_name: name, created_at: "2026-10-20T08:00:00Z" };
}

const me = user(ME_ID, "You");
const sam = user("sam", "Sam");
const kim = user("kim", "Kim");
const jonas = user("jonas", "Jonas");

export const nearbyUsers = [sam, kim, jonas];
export const incomingInvite = { id: "invite-1", from: jonas };

let nextId = 1;
const id = (prefix: string) => `${prefix}-${nextId++}`;

function message(
  conversationId: string,
  sender: User,
  transcript: string,
  minutesAgo: number,
): Message {
  return {
    id: id("msg"),
    conversation_id: conversationId,
    sender_id: sender.id,
    transcript,
    duration_ms: 3000,
    created_at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    sender: { id: sender.id, display_name: sender.display_name },
  };
}

let state: { conversations: Conversation[]; messages: Message[] } = {
  conversations: [
    {
      id: "conv-sam",
      name: "Night shift",
      created_by: ME_ID,
      created_at: "2026-10-20T08:00:00Z",
      members: [me, sam],
    },
    {
      id: "conv-kim",
      name: null,
      created_by: "kim",
      created_at: "2026-10-20T09:00:00Z",
      members: [me, kim],
    },
  ],
  messages: [
    message("conv-sam", sam, "Room 12 needs fresh sheets before the morning round.", 95),
    message("conv-sam", me, "On it, I'll grab them from storage.", 93),
    message("conv-kim", kim, "Pharmacy closes at six today.", 40),
  ],
};

const listeners = new Set<() => void>();

function update(next: typeof state) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function useMockStore() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

export function startConversation(other: User): Conversation {
  const existing = state.conversations.find(
    (c) => c.members.length === 2 && c.members.some((m) => m.id === other.id),
  );
  if (existing) return existing;

  const conversation: Conversation = {
    id: id("conv"),
    name: null,
    created_by: ME_ID,
    created_at: new Date().toISOString(),
    members: [me, other],
  };
  update({ ...state, conversations: [conversation, ...state.conversations] });
  return conversation;
}

// Adds a message without a transcript, then fills it in a moment later, like the server does.
export function addMessage(conversationId: string, sender: User, durationMs: number) {
  const added: Message = {
    ...message(conversationId, sender, "", 0),
    transcript: null,
    duration_ms: durationMs,
  };
  update({ ...state, messages: [...state.messages, added] });

  setTimeout(() => {
    const transcript = `(stub transcript of ${(durationMs / 1000).toFixed(1)}s of audio)`;
    update({
      ...state,
      messages: state.messages.map((m) => (m.id === added.id ? { ...m, transcript } : m)),
    });
  }, 1500);
}

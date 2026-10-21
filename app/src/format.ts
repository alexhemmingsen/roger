import type { Conversation } from "./types";

// A conversation's name, or the other members' names when it has none.
export function conversationTitle(conversation: Conversation, myId: string): string {
  if (conversation.name) return conversation.name;
  const others = conversation.members.filter((m) => m.id !== myId);
  return others.map((m) => m.display_name).join(", ") || "Just you";
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

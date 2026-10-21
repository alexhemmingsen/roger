import { useRef, useState } from "react";
import { addMessage, ME_ID } from "@/mock-store";
import type { Conversation, User } from "@/types";

export type TalkState = "offline" | "idle" | "requesting" | "talking" | "listening";

const millisecondsSince = (start: number) => Date.now() - start;

// Mock push-to-talk: the server grants the conversation after a short delay,
// and the other member "replies" after you finish, so every state can be seen.
export function useTalk(conversation: Conversation | undefined) {
  const [state, setState] = useState<TalkState>("idle");
  const [speaker, setSpeaker] = useState<User | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const holding = useRef(false);

  const other = conversation?.members.find((m) => m.id !== ME_ID);

  function start() {
    if (state !== "idle") return;
    holding.current = true;
    setState("requesting");
    setTimeout(() => {
      if (!holding.current) return setState("idle");
      setStartedAt(Date.now());
      setState("talking");
    }, 400);
  }

  function stop() {
    holding.current = false;
    if (state !== "talking" || !conversation || !startedAt) return;
    const me = conversation.members.find((m) => m.id === ME_ID)!;
    addMessage(conversation.id, me, millisecondsSince(startedAt));
    setStartedAt(null);
    setState("idle");
    if (other) simulateReply(conversation.id, other);
  }

  function simulateReply(conversationId: string, from: User) {
    setTimeout(() => {
      setSpeaker(from);
      setState("listening");
    }, 1500);
    setTimeout(() => {
      addMessage(conversationId, from, 2500);
      setSpeaker(null);
      setState("idle");
    }, 4000);
  }

  return { state, speaker, startedAt, start, stop };
}

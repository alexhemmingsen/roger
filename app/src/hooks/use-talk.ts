import { useRef, useState } from "react";
import { send, useConnected, useServerEvent } from "@/realtime";
import type { Conversation } from "@/types";

export type TalkState = "offline" | "idle" | "requesting" | "talking" | "listening";

const now = () => Date.now();

// Push-to-talk for one conversation. Audio comes later; this handles who may talk.
export function useTalk(conversation: Conversation | null) {
  const connected = useConnected();
  const [phase, setPhase] = useState<Exclude<TalkState, "offline">>("idle");
  const [speakerId, setSpeakerId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const holding = useRef(false);

  useServerEvent((event) => {
    if (event.type === "disconnected" || event.type === "talk_denied") {
      setPhase("idle");
      setStartedAt(null);
      return;
    }
    if (!("conversationId" in event) || event.conversationId !== conversation?.id) return;

    if (event.type === "talk_granted") {
      // Let go before the server answered: give the turn straight back.
      if (!holding.current) {
        send({ type: "talk_stop" });
        setPhase("idle");
        return;
      }
      setStartedAt(now());
      setPhase("talking");
    } else if (event.type === "talk_started") {
      setSpeakerId(event.speakerId);
      setPhase("listening");
    } else if (event.type === "talk_ended") {
      setSpeakerId(null);
      setPhase("idle");
    }
  });

  function start() {
    if (!conversation || phase !== "idle") return;
    holding.current = true;
    setPhase("requesting");
    send({ type: "talk_start", conversationId: conversation.id });
  }

  function stop() {
    holding.current = false;
    if (phase !== "talking") return;
    send({ type: "talk_stop" });
    setStartedAt(null);
    setPhase("idle");
  }

  const speaker = conversation?.members.find((m) => m.id === speakerId) ?? null;
  return { state: connected ? phase : ("offline" as const), speaker, startedAt, start, stop };
}

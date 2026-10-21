import { useEffect, useRef, useState } from "react";
import { requestMicrophone, startRecording, stopRecording } from "@/audio";
import { send, sendAudio, useConnected, useServerEvent } from "@/realtime";
import type { Conversation } from "@/types";

export type TalkState = "offline" | "idle" | "requesting" | "talking" | "listening";

const now = () => Date.now();

// Push-to-talk for one conversation: asks the server for the turn, then streams the microphone.
export function useTalk(conversation: Conversation | null) {
  const connected = useConnected();
  const [phase, setPhase] = useState<Exclude<TalkState, "offline">>("idle");
  const [speakerId, setSpeakerId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const holding = useRef(false);

  // Ask for the microphone up front, so the permission prompt doesn't interrupt the first talk.
  useEffect(() => {
    requestMicrophone();
  }, []);

  useServerEvent((event) => {
    if (event.type === "disconnected" || event.type === "talk_denied") {
      stopRecording();
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
      startRecording(sendAudio).then((started) => {
        if (started && holding.current) return;
        // The microphone failed, or the button was released while it was starting.
        stopRecording().then(() => send({ type: "talk_stop" }));
        setPhase("idle");
      });
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
    // Stop the microphone first, so the last chunk reaches the server before talk_stop.
    stopRecording().then(() => send({ type: "talk_stop" }));
    setStartedAt(null);
    setPhase("idle");
  }

  const speaker = conversation?.members.find((m) => m.id === speakerId) ?? null;
  return { state: connected ? phase : ("offline" as const), speaker, startedAt, start, stop };
}

// The app's single WebSocket to the server: being online, invites and push-to-talk.
import { useEffect, useEffectEvent, useSyncExternalStore } from "react";
import { API_URL } from "./api";
import { accessToken } from "./supabase";
import type { Conversation, Message, User } from "./types";

export type ServerEvent =
  | { type: "invite"; inviteId: string; from: User }
  | { type: "invite_accepted"; inviteId: string; conversation: Conversation }
  | { type: "invite_declined"; inviteId: string }
  | { type: "talk_granted"; conversationId: string }
  | { type: "talk_denied"; message: string }
  | { type: "talk_started"; conversationId: string; speakerId: string }
  | { type: "talk_ended"; conversationId: string; message: Message | null }
  | { type: "error"; message: string }
  | { type: "disconnected" };

// React Native's WebSocket accepts headers as a third argument. The browser types don't know that.
const NativeWebSocket = WebSocket as unknown as new (
  url: string,
  protocols: string[] | null,
  options: { headers: Record<string, string> },
) => WebSocket;

const listeners = new Set<(event: ServerEvent) => void>();
const statusListeners = new Set<() => void>();
let socket: WebSocket | null = null;
let connected = false;
let wanted = false;
let retry: ReturnType<typeof setTimeout> | undefined;

function setConnected(value: boolean) {
  connected = value;
  statusListeners.forEach((listener) => listener());
}

function emit(event: ServerEvent) {
  listeners.forEach((listener) => listener(event));
}

export async function connect() {
  wanted = true;
  const token = await accessToken();
  if (!token || !wanted || socket) return;

  const ws = new NativeWebSocket(`${API_URL.replace(/^http/, "ws")}/api/ws`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });
  socket = ws;
  ws.onopen = () => setConnected(true);
  ws.onmessage = (message) => {
    if (typeof message.data === "string") emit(JSON.parse(message.data));
  };
  ws.onclose = () => {
    if (socket === ws) socket = null;
    setConnected(false);
    emit({ type: "disconnected" });
    // Try again, e.g. while the free server wakes up or after a dropped connection.
    if (wanted) retry = setTimeout(connect, 2000);
  };
}

export function disconnect() {
  wanted = false;
  clearTimeout(retry);
  socket?.close();
  socket = null;
}

export function send(event: object) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
}

export function useConnected(): boolean {
  return useSyncExternalStore(
    (listener) => {
      statusListeners.add(listener);
      return () => statusListeners.delete(listener);
    },
    () => connected,
  );
}

export function useServerEvent(handler: (event: ServerEvent) => void) {
  const onEvent = useEffectEvent(handler);
  useEffect(() => {
    const listener = (event: ServerEvent) => onEvent(event);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
}

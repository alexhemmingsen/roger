import { accessToken } from "./supabase";
import type { Conversation, Message, User } from "./types";

export const API_URL = process.env.EXPO_PUBLIC_API_URL!;

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await accessToken();
  const response = await fetch(API_URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Not JSON, e.g. an error page while the server is starting.
  }
  if (!response.ok) {
    throw new Error(json?.error ?? `Request failed (${response.status})`);
  }
  return json as T;
}

export const api = {
  getMe: () => request<User>("GET", "/api/me"),
  updateMe: (displayName: string) => request<User>("PUT", "/api/me", { displayName }),
  nearby: () => request<User[]>("GET", "/api/nearby"),
  conversations: () => request<Conversation[]>("GET", "/api/conversations"),
  conversation: (id: string) => request<Conversation>("GET", `/api/conversations/${id}`),
  messages: (id: string) => request<Message[]>("GET", `/api/conversations/${id}/messages`),
  invite: (userId: string) =>
    request<{ id: string }>("POST", "/api/conversations/invites", { userId }),
  accept: (inviteId: string) =>
    request<Conversation>("POST", `/api/conversations/invites/${inviteId}/accept`),
  decline: (inviteId: string) =>
    request<null>("POST", `/api/conversations/invites/${inviteId}/decline`),
  ask: (question: string) =>
    request<{ answer: string }>("POST", "/api/assistant/ask", { question }),
};

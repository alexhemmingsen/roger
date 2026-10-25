import type { WSContext } from "hono/ws";

// The open connections from phones, one per user, and sending on them.
// Kept in memory, so it only works with one server. At scale, Redis replaces this.

type Connection = { socket: WSContext; networkId: string };

const open = new Map<string, Connection>();

export function addConnection(
  userId: string,
  socket: WSContext,
  networkId: string,
): void {
  open.get(userId)?.socket.close(4000, "Connected from another device");
  open.set(userId, { socket, networkId });
}

// Only removes the connection if it's still the current one, so an old socket
// closing after a reconnect doesn't take the user offline.
export function removeConnection(userId: string, socket: WSContext): void {
  if (open.get(userId)?.socket === socket) open.delete(userId);
}

export function networkOf(userId: string): string | undefined {
  return open.get(userId)?.networkId;
}

export function usersOnNetwork(networkId: string): string[] {
  return [...open]
    .filter(([, c]) => c.networkId === networkId)
    .map(([id]) => id);
}

export function sendEvent(
  userId: string,
  event: { type: string; [key: string]: unknown },
): void {
  open.get(userId)?.socket.send(JSON.stringify(event));
}

export function sendAudio(userId: string, chunk: ArrayBuffer): void {
  open.get(userId)?.socket.send(chunk);
}

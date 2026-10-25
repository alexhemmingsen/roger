import type { WSContext } from "hono/ws";
import { describe, expect, it, vi } from "vitest";
import {
  addConnection,
  networkOf,
  removeConnection,
  sendAudio,
  sendEvent,
  usersOnNetwork,
} from "./connections.ts";

// Connections live in memory between tests, so each test uses its own user IDs.
function fakeSocket() {
  return { send: vi.fn(), close: vi.fn() } as unknown as WSContext & {
    send: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };
}

describe("addConnection", () => {
  it("replaces an older connection from the same user and closes it", () => {
    const oldSocket = fakeSocket();
    const newSocket = fakeSocket();
    addConnection("device-user", oldSocket, "net-1");
    addConnection("device-user", newSocket, "net-1");

    sendEvent("device-user", { type: "ping" });

    expect(oldSocket.close).toHaveBeenCalled();
    expect(oldSocket.send).not.toHaveBeenCalled();
    expect(newSocket.send).toHaveBeenCalledWith('{"type":"ping"}');
  });
});

describe("removeConnection", () => {
  it("ignores an old socket closing after a new one connected", () => {
    const oldSocket = fakeSocket();
    const newSocket = fakeSocket();
    addConnection("reconnect-user", oldSocket, "net-1");
    addConnection("reconnect-user", newSocket, "net-1");

    removeConnection("reconnect-user", oldSocket);
    sendEvent("reconnect-user", { type: "ping" });

    expect(newSocket.send).toHaveBeenCalled();
  });

  it("stops sending to a user once removed", () => {
    const socket = fakeSocket();
    addConnection("leaving-user", socket, "net-1");

    removeConnection("leaving-user", socket);
    sendEvent("leaving-user", { type: "ping" });

    expect(socket.send).not.toHaveBeenCalled();
    expect(networkOf("leaving-user")).toBeUndefined();
  });
});

describe("networks", () => {
  it("knows each user's network and who is on a network", () => {
    addConnection("net-a", fakeSocket(), "net-2");
    addConnection("net-b", fakeSocket(), "net-2");
    addConnection("net-c", fakeSocket(), "net-3");

    expect(networkOf("net-a")).toBe("net-2");
    expect(usersOnNetwork("net-2")).toEqual(["net-a", "net-b"]);
  });
});

describe("sendAudio", () => {
  it("sends the audio chunk as is", () => {
    const socket = fakeSocket();
    const chunk = new ArrayBuffer(8);
    addConnection("audio-user", socket, "net-1");

    sendAudio("audio-user", chunk);

    expect(socket.send).toHaveBeenCalledWith(chunk);
  });
});

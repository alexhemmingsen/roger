import type { WSContext } from "hono/ws";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUsers } from "../services/users.ts";
import {
  connect,
  disconnect,
  listNearby,
  networkId,
  sameNetwork,
  sendAudio,
  sendEvent,
} from "./presence.ts";

vi.mock("../supabase.ts", () => ({ supabaseAdmin: {} }));
vi.mock("../services/users.ts");

function fakeSocket() {
  return { send: vi.fn(), close: vi.fn() } as unknown as WSContext & {
    send: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };
}

beforeEach(() => vi.resetAllMocks());

describe("networkId", () => {
  it.each([
    ["203.0.113.7", "203.0.113.7"],
    ["::ffff:203.0.113.7", "203.0.113.7"],
    ["192.168.1.20", "local"],
    ["10.0.0.5", "local"],
    ["172.20.1.1", "local"],
    ["127.0.0.1", "local"],
    ["::1", "local"],
    ["fe80::1", "local"],
    ["2001:db8:abcd:12:1:2:3:4", "2001:db8:abcd:12"],
    ["2001:db8::1", "2001:db8:0:0"],
    ["2001:0db8:00ab::1", "2001:db8:ab:0"],
  ])("%s is network %s", (ip, expected) => {
    expect(networkId(ip)).toBe(expected);
  });
});

describe("listNearby", () => {
  it("returns other online users on the same network", async () => {
    connect("nearby-a", "203.0.113.7", fakeSocket());
    connect("nearby-b", "203.0.113.7", fakeSocket());
    connect("nearby-c", "198.51.100.1", fakeSocket());
    vi.mocked(getUsers).mockResolvedValue([]);

    await listNearby("nearby-a", "203.0.113.7");

    expect(getUsers).toHaveBeenCalledWith(["nearby-b"]);
  });
});

describe("sameNetwork", () => {
  it("is true only when both users are online on the same network", () => {
    connect("same-a", "203.0.113.8", fakeSocket());
    connect("same-b", "203.0.113.8", fakeSocket());
    connect("same-c", "198.51.100.2", fakeSocket());

    expect(sameNetwork("same-a", "same-b")).toBe(true);
    expect(sameNetwork("same-a", "same-c")).toBe(false);
    expect(sameNetwork("same-a", "offline-user")).toBe(false);
  });
});

describe("connect and disconnect", () => {
  it("replaces an older connection and closes it", () => {
    const oldSocket = fakeSocket();
    const newSocket = fakeSocket();
    connect("device-user", "203.0.113.9", oldSocket);
    connect("device-user", "203.0.113.9", newSocket);

    sendEvent("device-user", { type: "ping" });

    expect(oldSocket.close).toHaveBeenCalled();
    expect(oldSocket.send).not.toHaveBeenCalled();
    expect(newSocket.send).toHaveBeenCalledWith('{"type":"ping"}');
  });

  it("ignores the old socket closing after a new one connected", () => {
    const oldSocket = fakeSocket();
    const newSocket = fakeSocket();
    connect("reconnect-user", "203.0.113.9", oldSocket);
    connect("reconnect-user", "203.0.113.9", newSocket);

    disconnect("reconnect-user", oldSocket);
    sendEvent("reconnect-user", { type: "ping" });

    expect(newSocket.send).toHaveBeenCalled();
  });

  it("stops sending to a user after they disconnect", () => {
    const socket = fakeSocket();
    connect("leaving-user", "203.0.113.9", socket);

    disconnect("leaving-user", socket);
    sendEvent("leaving-user", { type: "ping" });

    expect(socket.send).not.toHaveBeenCalled();
  });
});

describe("sendAudio", () => {
  it("sends the audio chunk as is", () => {
    const socket = fakeSocket();
    const chunk = new ArrayBuffer(8);
    connect("audio-user", "203.0.113.9", socket);

    sendAudio("audio-user", chunk);

    expect(socket.send).toHaveBeenCalledWith(chunk);
  });
});

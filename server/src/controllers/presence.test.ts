import type { WSContext } from "hono/ws";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUsers } from "../services/users.ts";
import {
  connect,
  disconnect,
  listNearby,
  networkId,
  sameNetwork,
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
  it("files the user under the network of their address", () => {
    connect("local-user", "192.168.1.20", fakeSocket());
    connect("other-local-user", "10.0.0.5", fakeSocket());

    expect(sameNetwork("local-user", "other-local-user")).toBe(true);
  });

  it("takes the user offline when they disconnect", () => {
    const socket = fakeSocket();
    connect("leaving-a", "203.0.113.9", socket);
    connect("leaving-b", "203.0.113.9", fakeSocket());

    disconnect("leaving-a", socket);

    expect(sameNetwork("leaving-a", "leaving-b")).toBe(false);
  });
});

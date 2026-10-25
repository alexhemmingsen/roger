import { BlockList, isIPv6 } from "node:net";
import type { WSContext } from "hono/ws";
import {
  addConnection,
  networkOf,
  removeConnection,
  usersOnNetwork,
} from "../services/connections.ts";
import { getUsers } from "../services/users.ts";
import type { User } from "../types/users.ts";

const localAddresses = new BlockList();
localAddresses.addSubnet("10.0.0.0", 8);
localAddresses.addSubnet("172.16.0.0", 12);
localAddresses.addSubnet("192.168.0.0", 16);
localAddresses.addSubnet("127.0.0.0", 8);
localAddresses.addSubnet("169.254.0.0", 16);
localAddresses.addAddress("::1", "ipv6");
localAddresses.addSubnet("fc00::", 7, "ipv6");
localAddresses.addSubnet("fe80::", 10, "ipv6");

// Devices on the same Wi-Fi share a public IPv4 address, or an IPv6 /64 prefix.
// Local addresses (the server running on your own network) all count as one network.
export function networkId(ip: string): string {
  const address = ip.replace(/^::ffff:/, "");
  const family = isIPv6(address) ? "ipv6" : "ipv4";
  if (localAddresses.check(address, family)) return "local";
  if (family === "ipv4") return address;
  return ipv6Prefix(address);
}

function ipv6Prefix(address: string): string {
  const [head = "", tail = ""] = address.split("::");
  const start = head ? head.split(":") : [];
  const end = tail ? tail.split(":") : [];
  const zeros = Array(8 - start.length - end.length).fill("0");
  return [...start, ...zeros, ...end]
    .slice(0, 4)
    .map((group) => parseInt(group, 16).toString(16))
    .join(":");
}

export function connect(userId: string, ip: string, socket: WSContext): void {
  addConnection(userId, socket, networkId(ip));
}

export function disconnect(userId: string, socket: WSContext): void {
  removeConnection(userId, socket);
}

// Both users must be online, on the same network.
export function sameNetwork(userA: string, userB: string): boolean {
  const network = networkOf(userA);
  return !!network && network === networkOf(userB);
}

export function listNearby(userId: string, ip: string): Promise<User[]> {
  const ids = usersOnNetwork(networkId(ip)).filter((id) => id !== userId);
  return getUsers(ids);
}

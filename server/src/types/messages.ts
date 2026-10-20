import type { Tables } from "../database.types.ts";
import type { User } from "./users.ts";

export type Message = Tables<"messages">;
export type MessageWithSender = Message & {
  // Null when the sender's account has been deleted.
  sender: Pick<User, "id" | "display_name"> | null;
};

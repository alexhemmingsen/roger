import type { Tables } from "../database.types.ts";
import type { User } from "./users.ts";

export type Conversation = Tables<"conversations">;
export type ConversationWithMembers = Conversation & { members: User[] };

// Same shapes as the server's API responses.

export type User = {
  id: string;
  display_name: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  name: string | null;
  created_by: string | null;
  created_at: string;
  members: User[];
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  transcript: string | null;
  duration_ms: number;
  created_at: string;
  sender: Pick<User, "id" | "display_name"> | null;
};

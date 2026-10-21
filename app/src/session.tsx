import { createContext, use, useState, type ReactNode } from "react";
import { ME_ID } from "./mock-store";

type Session = {
  user: { id: string; displayName: string } | null;
  logIn: (displayName: string) => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

// Mock for now. The real version signs in anonymously with Supabase and saves the name on the server.
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Session["user"]>(null);

  async function logIn(displayName: string) {
    setUser({ id: ME_ID, displayName });
  }

  return <SessionContext value={{ user, logIn }}>{children}</SessionContext>;
}

export function useSession(): Session {
  const session = use(SessionContext);
  if (!session) throw new Error("useSession must be used inside SessionProvider");
  return session;
}

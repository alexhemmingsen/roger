import { useEffect } from "react";
import { useMeQuery } from "./queries";
import * as realtime from "./realtime";
import type { User } from "./types";

// Logged in means: a saved Supabase session and a display name on the server.
export function useSession() {
  const me = useMeQuery();
  const user = me.data ?? null;

  // Being connected is what makes you show up as online for others.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    realtime.connect();
    return () => realtime.disconnect();
  }, [userId]);

  return { user, loading: me.isPending };
}

export function useMe(): User {
  const { data } = useMeQuery();
  if (!data) throw new Error("useMe needs a logged-in user");
  return data;
}

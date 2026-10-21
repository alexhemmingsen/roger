import {
  focusManager,
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AppState } from "react-native";
import { api } from "./api";
import { ensureSignedIn } from "./supabase";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

// Refetch stale queries when the app comes back to the foreground.
AppState.addEventListener("change", (state) => {
  focusManager.setFocused(state === "active");
});

const keys = {
  me: ["me"] as const,
  nearby: ["nearby"] as const,
  conversations: ["conversations"] as const,
  conversation: (id: string) => ["conversation", id] as const,
  messages: (id: string) => ["messages", id] as const,
};

// Reads

// Fails when there is no saved session or no display name yet, which means logged out.
export function useMeQuery() {
  return useQuery({ queryKey: keys.me, queryFn: api.getMe, retry: false, staleTime: Infinity });
}

export function useNearby() {
  return useQuery({ queryKey: keys.nearby, queryFn: api.nearby, refetchInterval: 5000 });
}

export function useConversations() {
  return useQuery({ queryKey: keys.conversations, queryFn: api.conversations });
}

export function useConversation(id: string) {
  return useQuery({ queryKey: keys.conversation(id), queryFn: () => api.conversation(id) });
}

export function useMessages(id: string) {
  return useQuery({ queryKey: keys.messages(id), queryFn: () => api.messages(id) });
}

export function refreshMessages(id: string) {
  return queryClient.invalidateQueries({ queryKey: keys.messages(id) });
}

// Writes

export function useLogIn() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (displayName: string) => {
      await ensureSignedIn();
      return api.updateMe(displayName);
    },
    onSuccess: (user) => client.setQueryData(keys.me, user),
  });
}

export function useInvite() {
  return useMutation({ mutationFn: api.invite });
}

export function useAcceptInvite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.accept,
    onSuccess: () => client.invalidateQueries({ queryKey: keys.conversations }),
  });
}

export function useDeclineInvite() {
  return useMutation({ mutationFn: api.decline });
}

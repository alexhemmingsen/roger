import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Alert } from "react-native";
import { queryClient, useAcceptInvite, useDeclineInvite } from "@/queries";
import { useServerEvent } from "@/realtime";
import { useSession } from "@/session";

// Keep the splash screen up until we know whether a saved session exists.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootStack />
    </QueryClientProvider>
  );
}

function RootStack() {
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading) SplashScreen.hide();
  }, [loading]);

  return (
    <>
      {user && <InviteListener />}
      <Stack>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="conversation/[id]"
            options={{ title: "", headerBackButtonDisplayMode: "minimal" }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

// Incoming invites can arrive on any screen, so they're shown as an alert.
function InviteListener() {
  const router = useRouter();
  const accept = useAcceptInvite();
  const decline = useDeclineInvite();

  useServerEvent((event) => {
    if (event.type !== "invite") return;
    Alert.alert(`${event.from.display_name} wants to talk`, undefined, [
      { text: "Decline", style: "cancel", onPress: () => decline.mutate(event.inviteId) },
      {
        text: "Accept",
        onPress: () =>
          accept.mutate(event.inviteId, {
            onSuccess: (conversation) => router.push(`/conversation/${conversation.id}`),
            onError: (e) => Alert.alert("Couldn't accept", e.message),
          }),
      },
    ]);
  });

  return null;
}

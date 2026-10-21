import { Stack } from "expo-router";
import { SessionProvider, useSession } from "@/session";

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootStack />
    </SessionProvider>
  );
}

function RootStack() {
  const { user } = useSession();

  return (
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
  );
}

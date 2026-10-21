import { Stack } from "expo-router";

export default function ConversationsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Conversations", headerLargeTitle: true }} />
    </Stack>
  );
}

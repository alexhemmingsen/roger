import { Stack } from "expo-router";

export default function AskLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Ask", headerLargeTitle: true }} />
    </Stack>
  );
}

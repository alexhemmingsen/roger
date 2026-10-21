import { NativeTabs } from "expo-router/native-tabs";

export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(people)">
        <NativeTabs.Trigger.Label>People</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.2.fill" md="group" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="conversations">
        <NativeTabs.Trigger.Label>Conversations</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right.fill" md="forum" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

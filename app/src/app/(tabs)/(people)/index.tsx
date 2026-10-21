import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { usePullToRefresh, useRefreshOnFocus } from "@/hooks/use-refresh";
import { useInvite, useNearby } from "@/queries";
import { useServerEvent } from "@/realtime";
import { useTheme } from "@/theme";
import type { User } from "@/types";

export default function PeopleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const nearby = useNearby();
  const invite = useInvite();
  const pull = usePullToRefresh(nearby.refetch);
  useRefreshOnFocus(nearby.refetch);
  const [waiting, setWaiting] = useState<{ userId: string; inviteId: string } | null>(null);

  useServerEvent((event) => {
    if (!waiting) return;
    if (event.type === "invite_accepted" && event.inviteId === waiting.inviteId) {
      setWaiting(null);
      router.push(`/conversation/${event.conversation.id}`);
    } else if (event.type === "invite_declined" && event.inviteId === waiting.inviteId) {
      setWaiting(null);
      Alert.alert("They declined");
    }
  });

  function onTalk(user: User) {
    invite.mutate(user.id, {
      onSuccess: ({ id }) => setWaiting({ userId: user.id, inviteId: id }),
      onError: (e) => Alert.alert("Couldn't send invite", e.message),
    });
  }

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      data={nearby.data ?? []}
      keyExtractor={(user) => user.id}
      refreshing={pull.refreshing}
      onRefresh={pull.onRefresh}
      ListHeaderComponent={
        <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>ON YOUR WI-FI</Text>
      }
      ListEmptyComponent={
        nearby.data ? (
          <Text style={[styles.empty, { color: theme.secondaryText }]}>
            No one else is on your Wi-Fi right now.
          </Text>
        ) : nearby.error ? (
          <Text style={[styles.empty, { color: theme.secondaryText }]}>{nearby.error.message}</Text>
        ) : (
          <ActivityIndicator style={styles.empty} />
        )
      }
      renderItem={({ item: user }) => {
        const isWaiting = waiting?.userId === user.id;
        return (
          <View style={[styles.row, { borderBottomColor: theme.border }]}>
            <Avatar name={user.display_name} />
            <Text style={[styles.name, { color: theme.text }]}>{user.display_name}</Text>
            <Pressable
              // Tapping "Waiting…" stops waiting for an answer.
              onPress={() => (isWaiting ? setWaiting(null) : onTalk(user))}
              disabled={invite.isPending || (!!waiting && !isWaiting)}
              style={[styles.talkButton, { backgroundColor: theme.card }]}
            >
              <Text style={[styles.talkButtonText, { color: theme.accent }]}>
                {isWaiting ? "Waiting…" : "Talk"}
              </Text>
            </Pressable>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 13, marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
  empty: { textAlign: "center", marginTop: 48, fontSize: 16, marginHorizontal: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { flex: 1, fontSize: 17 },
  talkButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  talkButtonText: { fontSize: 15, fontWeight: "600" },
});

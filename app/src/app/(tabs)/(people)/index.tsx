import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { incomingInvite, nearbyUsers, startConversation } from "@/mock-store";
import { useTheme } from "@/theme";
import type { User } from "@/types";

export default function PeopleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [invited, setInvited] = useState<string | null>(null);
  const [invite, setInvite] = useState<typeof incomingInvite | null>(incomingInvite);

  function openConversationWith(user: User) {
    const conversation = startConversation(user);
    router.push(`/conversation/${conversation.id}`);
  }

  // Mock: the other person accepts after a moment.
  function onInvite(user: User) {
    setInvited(user.id);
    setTimeout(() => {
      setInvited(null);
      openConversationWith(user);
    }, 1200);
  }

  function onAccept() {
    if (!invite) return;
    setInvite(null);
    openConversationWith(invite.from);
  }

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      data={nearbyUsers}
      keyExtractor={(user) => user.id}
      ListHeaderComponent={
        <>
          {invite && (
            <View style={[styles.invite, { backgroundColor: theme.card }]}>
              <Avatar name={invite.from.display_name} />
              <Text style={[styles.inviteText, { color: theme.text }]}>
                <Text style={styles.bold}>{invite.from.display_name}</Text> wants to talk
              </Text>
              <Pressable onPress={() => setInvite(null)} hitSlop={8}>
                <Text style={[styles.action, { color: theme.secondaryText }]}>Decline</Text>
              </Pressable>
              <Pressable onPress={onAccept} hitSlop={8}>
                <Text style={[styles.action, styles.bold, { color: theme.accent }]}>Accept</Text>
              </Pressable>
            </View>
          )}
          <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
            ON YOUR WI-FI
          </Text>
        </>
      }
      ListEmptyComponent={
        <Text style={[styles.empty, { color: theme.secondaryText }]}>
          No one else is on your Wi-Fi right now.
        </Text>
      }
      renderItem={({ item: user }) => (
        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <Avatar name={user.display_name} />
          <Text style={[styles.name, { color: theme.text }]}>{user.display_name}</Text>
          <Pressable
            onPress={() => onInvite(user)}
            disabled={invited !== null}
            style={[styles.inviteButton, { backgroundColor: theme.card }]}
          >
            <Text style={[styles.inviteButtonText, { color: theme.accent }]}>
              {invited === user.id ? "Waiting…" : "Talk"}
            </Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  invite: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    margin: 16,
    padding: 12,
    borderRadius: 14,
  },
  inviteText: { flex: 1, fontSize: 16 },
  action: { fontSize: 16 },
  bold: { fontWeight: "600" },
  sectionTitle: { fontSize: 13, marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
  empty: { textAlign: "center", marginTop: 48, fontSize: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { flex: 1, fontSize: 17 },
  inviteButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  inviteButtonText: { fontSize: 15, fontWeight: "600" },
});

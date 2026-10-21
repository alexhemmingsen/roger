import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { conversationTitle, formatTime } from "@/format";
import { useMockStore } from "@/mock-store";
import { useTheme } from "@/theme";

export default function ConversationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { conversations, messages } = useMockStore();

  const rows = conversations
    .map((conversation) => {
      const last = messages.findLast((m) => m.conversation_id === conversation.id);
      return { conversation, last, activeAt: last?.created_at ?? conversation.created_at };
    })
    .sort((a, b) => b.activeAt.localeCompare(a.activeAt));

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      data={rows}
      keyExtractor={(row) => row.conversation.id}
      ListEmptyComponent={
        <Text style={[styles.empty, { color: theme.secondaryText }]}>
          No conversations yet. Start one from People.
        </Text>
      }
      renderItem={({ item: { conversation, last, activeAt } }) => {
        const title = conversationTitle(conversation);
        return (
          <Pressable
            onPress={() => router.push(`/conversation/${conversation.id}`)}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: theme.border, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Avatar name={title} size={48} />
            <View style={styles.text}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={[styles.time, { color: theme.secondaryText }]}>
                  {formatTime(activeAt)}
                </Text>
              </View>
              <Text style={[styles.preview, { color: theme.secondaryText }]} numberOfLines={2}>
                {last
                  ? `${last.sender?.display_name ?? "Unknown"}: ${last.transcript ?? "Transcribing…"}`
                  : "No messages yet"}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: "center", marginTop: 48, fontSize: 16 },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: "600" },
  time: { fontSize: 14 },
  preview: { fontSize: 15 },
});

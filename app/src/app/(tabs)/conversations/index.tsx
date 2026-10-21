import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { conversationTitle, formatDateTime } from "@/format";
import { usePullToRefresh, useRefreshOnFocus } from "@/hooks/use-refresh";
import { useConversations } from "@/queries";
import { useMe } from "@/session";
import { useTheme } from "@/theme";

export default function ConversationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const me = useMe();
  const conversations = useConversations();
  const pull = usePullToRefresh(conversations.refetch);
  useRefreshOnFocus(conversations.refetch);

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      data={conversations.data ?? []}
      keyExtractor={(conversation) => conversation.id}
      refreshing={pull.refreshing}
      onRefresh={pull.onRefresh}
      ListEmptyComponent={
        conversations.data ? (
          <Text style={[styles.empty, { color: theme.secondaryText }]}>
            No conversations yet. Start one from People.
          </Text>
        ) : conversations.error ? (
          <Text style={[styles.empty, { color: theme.secondaryText }]}>
            {conversations.error.message}
          </Text>
        ) : (
          <ActivityIndicator style={styles.empty} />
        )
      }
      renderItem={({ item: conversation }) => {
        const title = conversationTitle(conversation, me.id);
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
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
                Started {formatDateTime(conversation.created_at)}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: "center", marginTop: 48, fontSize: 16, marginHorizontal: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 17, fontWeight: "600" },
  subtitle: { fontSize: 15 },
});

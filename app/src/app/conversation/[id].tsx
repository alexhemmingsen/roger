import { Stack, useLocalSearchParams } from "expo-router";
import { useRef } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TalkButton } from "@/components/talk-button";
import { conversationTitle, formatTime } from "@/format";
import { usePullToRefresh, useRefreshOnFocus } from "@/hooks/use-refresh";
import { useTalk } from "@/hooks/use-talk";
import { refreshMessages, useConversation, useMessages } from "@/queries";
import { useServerEvent } from "@/realtime";
import { useMe } from "@/session";
import { useTheme } from "@/theme";
import type { Message } from "@/types";

export default function ConversationScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = useRef<FlatList<Message>>(null);

  const conversation = useConversation(id).data ?? null;
  const messages = useMessages(id);
  const pull = usePullToRefresh(messages.refetch);
  useRefreshOnFocus(messages.refetch);
  const talk = useTalk(conversation);

  // New messages appear when a talk ends. Transcripts follow a moment later.
  function reloadSoon() {
    refreshMessages(id);
    setTimeout(() => refreshMessages(id), 2500);
  }

  useServerEvent((event) => {
    if (event.type === "talk_ended" && event.conversationId === id) reloadSoon();
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: conversation ? conversationTitle(conversation, me.id) : "" }} />

      <FlatList
        ref={list}
        contentInsetAdjustmentBehavior="automatic"
        data={messages.data ?? []}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messages}
        refreshing={pull.refreshing}
        onRefresh={pull.onRefresh}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          messages.data ? (
            <Text style={[styles.empty, { color: theme.secondaryText }]}>
              Hold the button and say something.
            </Text>
          ) : messages.error ? (
            <Text style={[styles.empty, { color: theme.secondaryText }]}>
              {messages.error.message}
            </Text>
          ) : (
            <ActivityIndicator style={styles.empty} />
          )
        }
        renderItem={({ item }) => <MessageBubble message={item} mine={item.sender_id === me.id} />}
      />

      <View style={[styles.talkArea, { paddingBottom: insets.bottom + 24 }]}>
        <TalkButton
          state={talk.state}
          speakerName={talk.speaker?.display_name}
          startedAt={talk.startedAt}
          onPressIn={talk.start}
          onPressOut={() => {
            talk.stop();
            reloadSoon();
          }}
        />
      </View>
    </View>
  );
}

function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  const theme = useTheme();

  return (
    <View style={[styles.bubbleRow, mine && styles.mineRow]}>
      <Text style={[styles.meta, { color: theme.secondaryText }]}>
        {mine ? "You" : (message.sender?.display_name ?? "Unknown")} ·{" "}
        {formatTime(message.created_at)} · {Math.round(message.duration_ms / 1000)}s
      </Text>
      <View style={[styles.bubble, { backgroundColor: mine ? theme.accent : theme.card }]}>
        <Text
          style={[
            styles.transcript,
            { color: mine ? theme.onAccent : theme.text },
            !message.transcript && styles.pending,
          ]}
        >
          {message.transcript ?? "Transcribing…"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messages: { padding: 16, gap: 14, flexGrow: 1 },
  empty: { textAlign: "center", marginTop: 48, fontSize: 16 },
  bubbleRow: { alignItems: "flex-start", gap: 4, maxWidth: "85%" },
  mineRow: { alignSelf: "flex-end", alignItems: "flex-end" },
  meta: { fontSize: 12 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  transcript: { fontSize: 16 },
  pending: { fontStyle: "italic", opacity: 0.7 },
  talkArea: { alignItems: "center", paddingTop: 24 },
});

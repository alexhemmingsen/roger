import { Stack, useLocalSearchParams } from "expo-router";
import { useRef } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TalkButton } from "@/components/talk-button";
import { conversationTitle, formatTime } from "@/format";
import { useTalk } from "@/hooks/use-talk";
import { ME_ID, useMockStore } from "@/mock-store";
import { useTheme } from "@/theme";
import type { Message } from "@/types";

export default function ConversationScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { conversations, messages } = useMockStore();
  const conversation = conversations.find((c) => c.id === id);
  const history = messages.filter((m) => m.conversation_id === id);
  const talk = useTalk(conversation);
  const list = useRef<FlatList<Message>>(null);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: conversation ? conversationTitle(conversation) : "" }} />

      <FlatList
        ref={list}
        contentInsetAdjustmentBehavior="automatic"
        data={history}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.secondaryText }]}>
            Hold the button and say something.
          </Text>
        }
        renderItem={({ item }) => <MessageBubble message={item} />}
      />

      <View style={[styles.talkArea, { paddingBottom: insets.bottom + 24 }]}>
        <TalkButton
          state={talk.state}
          speakerName={talk.speaker?.display_name}
          startedAt={talk.startedAt}
          onPressIn={talk.start}
          onPressOut={talk.stop}
        />
      </View>
    </View>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const theme = useTheme();
  const mine = message.sender_id === ME_ID;

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

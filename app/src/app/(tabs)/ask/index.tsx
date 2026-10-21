import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { useAsk } from "@/queries";
import { useTheme } from "@/theme";

export default function AskScreen() {
  const theme = useTheme();
  const ask = useAsk();
  const [question, setQuestion] = useState("");
  const canAsk = question.trim().length > 0 && !ask.isPending;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.hint, { color: theme.secondaryText }]}>
        Ask about anything said in your conversations.
      </Text>

      <TextInput
        value={question}
        onChangeText={setQuestion}
        placeholder="What did Sam say about room 12?"
        placeholderTextColor={theme.secondaryText}
        multiline
        style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
      />

      <Pressable
        onPress={() => ask.mutate(question.trim())}
        disabled={!canAsk}
        style={[styles.button, { backgroundColor: theme.accent, opacity: canAsk ? 1 : 0.4 }]}
      >
        {ask.isPending ? (
          <ActivityIndicator color={theme.onAccent} />
        ) : (
          <Text style={[styles.buttonText, { color: theme.onAccent }]}>Ask</Text>
        )}
      </Pressable>

      {ask.error && <Text style={[styles.hint, { color: theme.secondaryText }]}>{ask.error.message}</Text>}
      {ask.data && (
        <Text style={[styles.answer, { backgroundColor: theme.card, color: theme.text }]}>
          {ask.data.answer}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  hint: { fontSize: 15 },
  input: { minHeight: 96, borderRadius: 14, padding: 14, fontSize: 17, textAlignVertical: "top" },
  button: { height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 17, fontWeight: "600" },
  answer: { borderRadius: 14, padding: 14, fontSize: 17, overflow: "hidden" },
});

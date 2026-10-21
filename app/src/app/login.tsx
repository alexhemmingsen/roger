import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { useLogIn } from "@/queries";
import { useTheme } from "@/theme";

export default function LoginScreen() {
  const theme = useTheme();
  const logIn = useLogIn();
  const [name, setName] = useState("");
  const loggingIn = logIn.isPending;
  const canLogIn = name.trim().length > 0 && !loggingIn;

  function onLogIn() {
    logIn.mutate(name.trim(), {
      onError: (e) => Alert.alert("Couldn't log in", e.message),
    });
  }

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Text style={[styles.title, { color: theme.text }]}>Roger</Text>
      <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
        Walkie-talkie for everyone on your Wi-Fi
      </Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={theme.secondaryText}
        maxLength={40}
        autoFocus
        returnKeyType="go"
        onSubmitEditing={() => canLogIn && onLogIn()}
        style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
      />

      <Pressable
        onPress={onLogIn}
        disabled={!canLogIn}
        style={[styles.button, { backgroundColor: theme.accent, opacity: canLogIn ? 1 : 0.4 }]}
      >
        {loggingIn ? (
          <ActivityIndicator color={theme.onAccent} />
        ) : (
          <Text style={[styles.buttonText, { color: theme.onAccent }]}>Log in</Text>
        )}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 16 },
  title: { fontSize: 44, fontWeight: "800", textAlign: "center" },
  subtitle: { fontSize: 17, textAlign: "center", marginBottom: 24 },
  input: { height: 52, borderRadius: 14, paddingHorizontal: 16, fontSize: 17 },
  button: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 17, fontWeight: "600" },
});

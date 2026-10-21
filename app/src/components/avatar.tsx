import { StyleSheet, Text, View } from "react-native";

const COLORS = ["#FF9F0A", "#30D158", "#64D2FF", "#BF5AF2", "#FF375F", "#5E5CE6"];

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const color = COLORS[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % COLORS.length];
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  initial: { color: "#FFFFFF", fontWeight: "600" },
});

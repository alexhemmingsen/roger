import { useColorScheme } from "react-native";

const light = {
  background: "#FFFFFF",
  card: "#F2F2F7",
  text: "#000000",
  secondaryText: "#6C6C70",
  border: "#E5E5EA",
  accent: "#0A84FF",
  onAccent: "#FFFFFF",
};

const dark: typeof light = {
  background: "#000000",
  card: "#1C1C1E",
  text: "#FFFFFF",
  secondaryText: "#98989F",
  border: "#38383A",
  accent: "#0A84FF",
  onAccent: "#FFFFFF",
};

export function useTheme() {
  return useColorScheme() === "dark" ? dark : light;
}

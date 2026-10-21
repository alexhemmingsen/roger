import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { TalkState } from "@/hooks/use-talk";
import { useTheme } from "@/theme";

const SIZE = 180;

const PALETTES: Record<TalkState, [string, string, string]> = {
  offline: ["#8E8E93", "#AEAEB2", "#636366"],
  idle: ["#5E5CE6", "#0A84FF", "#BF5AF2"],
  requesting: ["#5E5CE6", "#0A84FF", "#BF5AF2"],
  talking: ["#FF375F", "#FF9F0A", "#BF5AF2"],
  listening: ["#30D158", "#64D2FF", "#0A84FF"],
};

// How fast the orb spins (ms per turn) and pulses in each state.
const MOTION: Record<TalkState, { spin: number; pulse: number; pulseMs: number }> = {
  offline: { spin: 0, pulse: 1, pulseMs: 0 },
  idle: { spin: 9000, pulse: 1.03, pulseMs: 1800 },
  requesting: { spin: 4000, pulse: 0.92, pulseMs: 300 },
  talking: { spin: 1600, pulse: 1.12, pulseMs: 450 },
  listening: { spin: 2400, pulse: 1.08, pulseMs: 650 },
};

type Props = {
  state: TalkState;
  speakerName?: string;
  startedAt: number | null;
  onPressIn: () => void;
  onPressOut: () => void;
};

export function TalkButton({ state, speakerName, startedAt, onPressIn, onPressOut }: Props) {
  const theme = useTheme();
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const elapsed = useElapsedSeconds(startedAt);

  useEffect(() => {
    const { spin, pulse, pulseMs } = MOTION[state];
    cancelAnimation(rotation);
    cancelAnimation(scale);
    rotation.value = 0;
    if (spin) {
      rotation.value = withRepeat(withTiming(360, { duration: spin, easing: Easing.linear }), -1);
    }
    scale.value =
      state === "requesting"
        ? withTiming(pulse, { duration: pulseMs })
        : pulseMs
          ? withRepeat(
              withSequence(
                withTiming(pulse, { duration: pulseMs, easing: Easing.inOut(Easing.sin) }),
                withTiming(1, { duration: pulseMs, easing: Easing.inOut(Easing.sin) }),
              ),
              -1,
            )
          : withTiming(1);
  }, [state, rotation, scale]);

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  const [first, second, third] = PALETTES[state];
  const disabled = state === "offline" || state === "listening";
  const label = {
    offline: "Connecting to server…",
    idle: "Hold to talk",
    requesting: "Connecting…",
    talking: `Talking · ${formatSeconds(elapsed)}`,
    listening: `${speakerName ?? "Someone"} is talking`,
  }[state];

  return (
    <View style={styles.container}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        <Animated.View style={[styles.glow, { shadowColor: first }, orbStyle]}>
          <View style={[styles.orb, { backgroundColor: second }]}>
            <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
              <View style={[styles.blob, styles.blobTop, { backgroundImage: softCircle(first) }]} />
              <View style={[styles.blob, styles.blobLeft, { backgroundImage: softCircle(third) }]} />
              <View style={[styles.blob, styles.blobRight, { backgroundImage: softCircle(first) }]} />
            </Animated.View>
            <View style={styles.highlight} />
          </View>
        </Animated.View>
      </Pressable>
      <Text style={[styles.label, { color: theme.secondaryText }]}>{label}</Text>
    </View>
  );
}

function useElapsedSeconds(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [startedAt]);
  return startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
}

// A blob of colour that fades out towards its edge.
function softCircle(color: string): string {
  return `radial-gradient(circle, ${color} 0%, ${color}00 70%)`;
}

function formatSeconds(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const BLOB = SIZE * 1.1;

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 20 },
  glow: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    shadowOpacity: 0.6,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 0 },
  },
  orb: { flex: 1, borderRadius: SIZE / 2, overflow: "hidden" },
  blob: { position: "absolute", width: BLOB, height: BLOB },
  blobTop: { top: -SIZE * 0.55, left: (SIZE - BLOB) / 2 },
  blobLeft: { bottom: -SIZE * 0.5, left: -SIZE * 0.55 },
  blobRight: { bottom: -SIZE * 0.45, right: -SIZE * 0.6 },
  highlight: {
    ...StyleSheet.absoluteFill,
    backgroundImage:
      "radial-gradient(circle at 35% 28%, #FFFFFF73 0%, #FFFFFF00 38%)",
  },
  label: { fontSize: 17, fontWeight: "500", fontVariant: ["tabular-nums"] },
});

// state/skins/skinBloom.tsx
import type { Skin } from "@/state/skins";
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export type CardArgs = {
  name: string;
  skin: Skin;
  open: boolean; // true = open representation, false = closed representation
};

/**
 * Bloom card representation
 * - Closed: big title + subtle bloom
 * - Open: smaller title + tighter bloom
 * - Animation: simple fade/replace (plus a tiny scale bloom)
 *
 * IMPORTANT: This is a React component (so hooks are valid).
 */
export function CardRep({ name, skin, open }: CardArgs) {
  const t = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: open ? 1 : 0,
      duration: skin.motion?.bloomDurationMs ?? 220,
      easing: skin.motion?.easing,
      useNativeDriver: true,
    }).start();
  }, [open, skin.motion?.bloomDurationMs, skin.motion?.easing, t]);

  const closedOpacity = t.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const openOpacity = t.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // A gentle bloom scale effect layered under both states (optional but nice).
  const bloomScale = t.interpolate({
    inputRange: [0, 1],
    outputRange: [skin.motion?.bloomScaleFrom ?? 0.99, skin.motion?.bloomScaleTo ?? 1.06],
  });

  const bloomOpacity = useMemo(() => {
    // keep it subtle; clamp to something sane
    const o = skin.motion?.bloomOpacity ?? 0.12;
    return Math.max(0.04, Math.min(0.22, o));
  }, [skin.motion?.bloomOpacity]);

  return (
    <View style={styles.root}>
      {/* Bloom background layer */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bloomLayer,
          {
            opacity: bloomOpacity,
            transform: [{ scale: bloomScale }],
          },
        ]}
      >
        <View style={[styles.bloomA, { backgroundColor: skin.accent }]} />
        <View style={[styles.bloomB, { borderColor: skin.accent }]} />
        <View style={[styles.bloomC, { borderColor: skin.accent }]} />
      </Animated.View>

      {/* Closed */}
      <Animated.View style={[styles.layer, { opacity: closedOpacity }]}>
        <View style={styles.center}>
          <Text style={[styles.titleClosed, { color: skin.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.subClosed, { color: skin.muted }]} numberOfLines={1}>
            Tap to open
          </Text>
        </View>
      </Animated.View>

      {/* Open */}
      <Animated.View style={[styles.layer, { opacity: openOpacity }]}>
        <View style={styles.center}>
          <Text style={[styles.titleOpen, { color: skin.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.subOpen, { color: skin.muted }]} numberOfLines={1}>
            Swipe to switch
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 1 },
  layer: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", justifyContent: "center" },

  bloomLayer: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  bloomA: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 999,
    opacity: 0.12,
  },
  bloomB: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    borderWidth: 2,
    opacity: 0.14,
  },
  bloomC: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 999,
    borderWidth: 2,
    opacity: 0.08,
  },

  titleClosed: { fontWeight: "900", fontSize: 28, textAlign: "center" },
  subClosed: { marginTop: 6, fontSize: 12, fontWeight: "700", opacity: 0.9 },

  titleOpen: { fontWeight: "900", fontSize: 18, textAlign: "center" },
  subOpen: { marginTop: 4, fontSize: 11, fontWeight: "700", opacity: 0.9 },
});
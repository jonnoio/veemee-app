// state/skins/skinBloom.tsx
import type { Skin } from "@/state/skins";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

type CardArgs = { name: string; skin: Skin; open: boolean };

function ClosedBloom({ name, skin }: { name: string; skin: Skin }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.circle, { borderColor: skin.accent, opacity: 0.35 }]} />
      <Text style={[styles.titleClosed, { color: skin.text }]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

function OpenBloom({ name, skin }: { name: string; skin: Skin }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.circleOpen, { borderColor: skin.accent, opacity: 0.25 }]} />
      <Text style={[styles.titleOpen, { color: skin.text }]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

export function renderCard({ name, skin, open }: CardArgs) {
  const t = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(t, { toValue: open ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [open, t]);

  const closedOpacity = t.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const openOpacity = t.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[styles.layer, { opacity: closedOpacity }]}>
        <ClosedBloom name={name} skin={skin} />
      </Animated.View>
      <Animated.View style={[styles.layer, { opacity: openOpacity }]}>
        <OpenBloom name={name} skin={skin} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  wrap: { alignItems: "center", justifyContent: "center" },

  circle: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, marginBottom: 10 },
  circleOpen: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, marginBottom: 8 },

  titleClosed: { fontWeight: "900", fontSize: 28, textAlign: "center" },
  titleOpen: { fontWeight: "900", fontSize: 18, textAlign: "center" },
});
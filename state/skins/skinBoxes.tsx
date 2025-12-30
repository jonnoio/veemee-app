// state/skins/skinBoxes.tsx
import type { Skin } from "@/state/skins";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export type CardArgs = { name: string; skin: Skin; open: boolean };

function Closed({ name, skin }: { name: string; skin: Skin }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.boxRow}>
        <View style={[styles.box, { backgroundColor: skin.accent, opacity: 0.22 }]} />
        <View style={[styles.box, { backgroundColor: skin.accent, opacity: 0.12 }]} />
        <View style={[styles.box, { backgroundColor: skin.accent, opacity: 0.08 }]} />
      </View>
      <Text style={[styles.titleClosed, { color: skin.text }]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

function Open({ name, skin }: { name: string; skin: Skin }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.boxRowOpen}>
        <View style={[styles.boxOpen, { backgroundColor: skin.accent, opacity: 0.18 }]} />
        <View style={[styles.boxOpen, { backgroundColor: skin.accent, opacity: 0.10 }]} />
      </View>
      <Text style={[styles.titleOpen, { color: skin.text }]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

export function CardRep({ name, skin, open }: CardArgs) {
  const t = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: open ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [open, t]);

  const closedOpacity = t.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const openOpacity = t.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[styles.layer, { opacity: closedOpacity }]}>
        <Closed name={name} skin={skin} />
      </Animated.View>
      <Animated.View style={[styles.layer, { opacity: openOpacity }]}>
        <Open name={name} skin={skin} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  wrap: { alignItems: "center", justifyContent: "center" },

  boxRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  box: { width: 16, height: 16, borderRadius: 4 },

  boxRowOpen: { flexDirection: "row", gap: 10, marginBottom: 8 },
  boxOpen: { width: 22, height: 22, borderRadius: 6 },

  titleClosed: { fontWeight: "900", fontSize: 28, textAlign: "center" },
  titleOpen: { fontWeight: "900", fontSize: 18, textAlign: "center" },
});
// state/skins/skinBoxes.tsx
import type { Skin } from "@/state/skins";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export type CardItem = { name: string };
export type CardArgs = { item: CardItem; skin: Skin };

export function showClosedContext({ item, skin }: CardArgs) {
  return showClosedBoxes({ item, skin });
}

export function showOpenContext({ item, skin }: CardArgs) {
  return showOpenBoxes({ item, skin });
}

export function showClosedBoxes({ item, skin }: CardArgs) {
  return (
    <View style={styles.wrap}>
      <View style={styles.boxRow}>
        <View style={[styles.box, { backgroundColor: skin.accent, opacity: 0.22 }]} />
        <View style={[styles.box, { backgroundColor: skin.accent, opacity: 0.12 }]} />
        <View style={[styles.box, { backgroundColor: skin.accent, opacity: 0.08 }]} />
      </View>

      <Text style={[styles.titleClosed, { color: skin.text }]} numberOfLines={1}>
        {item.name}
      </Text>
    </View>
  );
}

export function showOpenBoxes({ item, skin }: CardArgs) {
  return (
    <View style={styles.wrap}>
      <View style={styles.boxRowOpen}>
        <View style={[styles.boxOpen, { backgroundColor: skin.accent, opacity: 0.18 }]} />
        <View style={[styles.boxOpen, { backgroundColor: skin.accent, opacity: 0.10 }]} />
      </View>

      <Text style={[styles.titleOpen, { color: skin.text }]} numberOfLines={1}>
        {item.name}
      </Text>
    </View>
  );
}

// Keep this if you like having the fade/replace live inside the rep
export function CardRepSwap({
  item,
  skin,
  isOpenMode,
}: {
  item: CardItem;
  skin: Skin;
  isOpenMode: boolean;
}) {
  const t = useRef(new Animated.Value(isOpenMode ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: isOpenMode ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isOpenMode, t]);

  const closedOpacity = t.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const openOpacity = t.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[styles.layer, { opacity: closedOpacity }]}>
        {showClosedContext({ item, skin })}
      </Animated.View>
      <Animated.View style={[styles.layer, { opacity: openOpacity }]}>
        {showOpenContext({ item, skin })}
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
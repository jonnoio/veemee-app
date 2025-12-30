import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

// Keep the public API tiny + boring
export type BloomItem = { name: string };
export type BloomSkin = { text: string; accent: string };

// “Public” functions — decide WHAT to show
export function showClosedContext(item: BloomItem, skin: BloomSkin) {
  return showClosedBloom(item, skin);
}

export function showOpenContext(item: BloomItem, skin: BloomSkin) {
  return showOpenBloom(item, skin);
}

// “Implementation” functions — decide HOW it looks
export function showClosedBloom(item: BloomItem, skin: BloomSkin) {
  return (
    <View style={styles.repWrap}>
      <View style={[styles.bud, { backgroundColor: skin.accent, opacity: 0.22 }]} />
      <Text style={[styles.repTitleClosed, { color: skin.text }]} numberOfLines={1}>
        {item.name}
      </Text>
    </View>
  );
}

export function showOpenBloom(item: BloomItem, skin: BloomSkin) {
  return (
    <View style={styles.repWrap}>
      <View style={styles.bloomWrap}>
        {Array.from({ length: 7 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.petal,
              {
                backgroundColor: skin.accent,
                opacity: 0.14,
                transform: [{ rotate: `${(i * 360) / 7}deg` }, { translateY: -26 }],
              },
            ]}
          />
        ))}
        <View style={[styles.core, { backgroundColor: skin.accent }]} />
      </View>

      <Text style={[styles.repTitleOpen, { color: skin.text }]} numberOfLines={1}>
        {item.name}
      </Text>
    </View>
  );
}

// Crossfade/replace wrapper
export function CardRepSwap({
  item,
  skin,
  isOpenMode,
}: {
  item: BloomItem;
  skin: BloomSkin;
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
      <Animated.View style={[styles.repLayer, { opacity: closedOpacity }]}>
        {showClosedContext(item, skin)}
      </Animated.View>

      <Animated.View style={[styles.repLayer, { opacity: openOpacity }]}>
        {showOpenContext(item, skin)}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  repLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },

  repWrap: {
    alignItems: "center",
    justifyContent: "center",
  },

  repTitleClosed: {
    fontWeight: "900",
    fontSize: 28,
    marginTop: 10,
    textAlign: "center",
  },

  repTitleOpen: {
    fontWeight: "900",
    fontSize: 18,
    marginTop: 8,
    textAlign: "center",
  },

  bud: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },

  bloomWrap: {
    width: 86,
    height: 86,
    alignItems: "center",
    justifyContent: "center",
  },

  petal: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
  },

  core: {
    width: 14,
    height: 14,
    borderRadius: 7,
    opacity: 0.9,
  },
});
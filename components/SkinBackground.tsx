import type { Skin } from "@/state/skins";
import React from "react";
import { StyleSheet, View } from "react-native";

export function SkinBackground({ skin }: { skin: Skin }) {
  if (skin.backgroundStyle === "solid") return null;

  if (skin.backgroundStyle === "grid") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.grid, { borderColor: skin.muted }]} />
      </View>
    );
  }

  if (skin.backgroundStyle === "waves") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.wave1, { borderColor: skin.muted }]} />
        <View style={[styles.wave2, { borderColor: skin.muted }]} />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  grid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    borderWidth: 1,
    borderRadius: 26,
    margin: 14,
  },
  wave1: {
    position: "absolute",
    width: 520,
    height: 520,
    borderRadius: 260,
    borderWidth: 1,
    opacity: 0.08,
    top: -220,
    left: -220,
  },
  wave2: {
    position: "absolute",
    width: 620,
    height: 620,
    borderRadius: 310,
    borderWidth: 1,
    opacity: 0.05,
    top: -260,
    left: -260,
  },
});
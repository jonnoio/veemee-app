import { useContextStore } from "@/state/ContextStore";
import { SkinRegistry } from "@/state/skins";
import { Stack, useRouter } from "expo-router";
import React, { useMemo, useRef } from "react";
import {
    Animated,
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = Math.round(SCREEN_W * 0.82);
const GAP = 14;
const SNAP = CARD_W + GAP;
const SIDE = Math.round((SCREEN_W - CARD_W) / 2);

type Item = {
  id: number;
  name: string;
  skinId: any;
  order?: number;
  isDeleted: boolean;
  isArchived: boolean;
};

export default function Contexts() {
  const router = useRouter();
  const { contexts, activeContextId, switchContext, createContext } = useContextStore();

  const visible = useMemo(
    () =>
      contexts
        .filter((c) => !c.isDeleted && !c.isArchived)
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
    [contexts]
  );

  // Sentinel list: [last, ...visible, first]
  const data = useMemo(() => {
    if (visible.length <= 1) return visible;
    const first = visible[0];
    const last = visible[visible.length - 1];
    return [last, ...visible, first];
  }, [visible]);

  const chromeSkin =
    SkinRegistry[(visible.find((c) => c.id === activeContextId)?.skinId ?? "simple") as any];

  const listRef = useRef<Animated.FlatList<Item>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onPick = (id: number) => {
    switchContext(id);
    router.replace("/dashboard");
  };

  const onAdd = () => {
    createContext({ name: "New context", skinId: "simple" });
    router.replace("/dashboard");
  };

  const jumpToIndex = (index: number) => {
    // IMPORTANT: include SIDE padding in the offset
    const offset = SIDE + SNAP * index;
    listRef.current?.scrollToOffset({ offset, animated: false });
  };

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (visible.length <= 1) return;

    const x = e.nativeEvent.contentOffset.x;

    // x includes SIDE padding, so remove it before calculating index
    const effectiveX = Math.max(0, x - SIDE);
    const i = Math.floor((effectiveX + SNAP / 2) / SNAP);

    // data = [sentinelLast, ...visible (len N), sentinelFirst]
    const lastRealIndex = visible.length; // index of last real item inside data
    const trailingSentinelIndex = lastRealIndex + 1;

    if (i === 0) {
      // Landed on leading sentinel (last) → jump to last real
      jumpToIndex(lastRealIndex);
      return;
    }

    if (i === trailingSentinelIndex) {
      // Landed on trailing sentinel (first) → jump to first real (index 1)
      jumpToIndex(1);
      return;
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Contexts", headerShown: false }} />

      <View style={[styles.screen, { backgroundColor: chromeSkin.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: chromeSkin.text }]}>Choose a context</Text>
          <Text style={[styles.subtitle, { color: chromeSkin.muted }]}>
            Veemee waits for you before it supports you.
          </Text>
        </View>

        <Animated.FlatList
          ref={listRef}
          data={data as any}
          keyExtractor={(item, idx) => ${item.id}-${idx}} // allow sentinels
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={SNAP}
          decelerationRate="fast"
          bounces={false}
          onMomentumScrollEnd={handleMomentumEnd}
          // Start on first REAL item (index 1) so you can swipe left into the sentinel
          initialScrollIndex={visible.length > 1 ? 1 : 0}
          getItemLayout={(_, index) => ({
            length: SNAP,
            offset: SIDE + SNAP * index, // IMPORTANT: include SIDE
            index,
          })}
          onScrollToIndexFailed={() => {
            requestAnimationFrame(() => {
              if (visible.length > 1) jumpToIndex(1);
            });
          }}
          contentContainerStyle={{
            paddingHorizontal: SIDE,
            paddingVertical: 10,
          }}
          ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
            useNativeDriver: true,
          })}
          scrollEventThrottle={16}
          renderItem={({ item, index }) => {
            const skin = SkinRegistry[item.skinId];

            const inputRange = [(index - 1) * SNAP, index * SNAP, (index + 1) * SNAP];

            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.96, 1.0, 0.96],
              extrapolate: "clamp",
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.72, 1.0, 0.72],
              extrapolate: "clamp",
            });

            const isActive = item.id === activeContextId;

            return (
              <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
                <Pressable
                  onPress={() => onPick(item.id)}
                  style={[styles.cardInner, { backgroundColor: skin.background }]}
                >
                  <View
                    pointerEvents="none"
                    style={[
                      styles.halo,
                      { backgroundColor: skin.accent, opacity: skin.motion?.bloomOpacity ?? 0.12 },
                    ]}
                  />

                  <View style={[styles.pill, { backgroundColor: skin.surface }]}>
                    <View style={[styles.pillDot, { backgroundColor: skin.accent }]} />
                    <Text style={[styles.pillText, { color: skin.text }]}>
                      {String(item.skinId).toUpperCase()}
                    </Text>
                  </View>

                  <Text style={[styles.cardTitle, { color: skin.text }]}>{item.name}</Text>

                  <Text style={[styles.cardMeta, { color: skin.muted }]}>
                    {isActive ? "Current context" : "Tap to enter"}
                  </Text>

                  <View style={[styles.cta, { backgroundColor: skin.accent }]}>
                    <Text style={styles.ctaText}>{isActive ? "Continue" : "Use this context"}</Text>
                  </View>
                </Pressable>
              </Animated.View>
            );
          }}
        />

        <View style={styles.dots}>
          {visible.map((c) => {
            const active = c.id === activeContextId;
            return (
              <View
                key={c.id}
                style={[
                  styles.dot,
                  {
                    backgroundColor: chromeSkin.text,
                    opacity: active ? 1 : 0.3,
                    width: active ? 18 : 8,
                  },
                ]}
              />
            );
          })}
        </View>

        <Pressable onPress={onAdd} style={[styles.addBtn, { backgroundColor: chromeSkin.accent }]}>
          <Text style={styles.addText}>+ Add context</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 64 },
  header: { paddingHorizontal: 16, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { marginTop: 6 },

  card: { width: CARD_W },
  cardInner: {
    borderRadius: 22,
    overflow: "hidden",
    padding: 18,
    minHeight: 320,
    justifyContent: "space-between",
  },

  halo: {
    position: "absolute",
    width: 520,
    height: 520,
    borderRadius: 260,
    top: -320,
    left: -240,
  },

  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillDot: { width: 10, height: 10, borderRadius: 5 },
  pillText: { fontSize: 12, fontWeight: "900" },

  cardTitle: { fontSize: 34, fontWeight: "900", marginTop: 10 },
  cardMeta: { fontSize: 13, marginTop: 6 },

  cta: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  ctaText: { color: "#0B0C10", fontWeight: "900" },

  dots: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: { height: 8, borderRadius: 999 },

  addBtn: {
    marginTop: 16,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 22,
  },
  addText: { color: "#0B0C10", fontWeight: "900" },
});
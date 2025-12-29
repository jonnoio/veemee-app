import { useContextStore } from "@/state/ContextStore";
import { SkinRegistry } from "@/state/skins";
import { Stack } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ActivityIndicator, FlatList, TouchableOpacity } from "react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CARD_W = Math.round(SCREEN_W * 0.82);
const GAP = 14;
const SNAP = CARD_W + GAP;
const SIDE = Math.round((SCREEN_W - CARD_W) / 2);
const closedCardHeight = 220; // tune
const openCardHeight = 84; // tune

// ✅ App-session flag: show intro header only once per app run
let hasShownContextsIntroHeader = false;

type Item = {
  id: number;
  name: string;
  skinId: any;
  order?: number;
  isDeleted: boolean;
  isArchived: boolean;
};

type Persona = {
  id: number;
  display_name: string;
  slug: string;
  task_count: number;
  context_id?: number;
};

export default function Contexts() {
  const { contexts, activeContextId, switchContext, createContext } = useContextStore();

  console.log("🔥 RUNNING app/index.tsx");

  // When null: "closed mode" (carousel centered-ish, minimal cards)
  // When id:   "open mode"   (carousel docked top, show context header + personas area)
  const [openContextId, setOpenContextId] = useState<number | null>(null);
  const isOpen = openContextId !== null;
  const selectedId = openContextId ?? activeContextId;

  const router = useRouter();

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personasLoading, setPersonasLoading] = useState(false);

  const ctxIdForPersonas = openContextId ?? activeContextId;

  const fetchPersonas = React.useCallback(async () => {
    try {
      const ctxId = ctxIdForPersonas;
      if (!ctxId) {
        setPersonas([]);
        return;
      }

      setPersonasLoading(true);

      const token = await SecureStore.getItemAsync("veemee-jwt");
      if (!token) {
        setPersonas([]);
        return;
      }

      const url = `https://veemee.onrender.com/api/contexts/${ctxId}/personas`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      const json = JSON.parse(text);
      setPersonas(json.personas || []);
    } catch (err) {
      console.error("🔥 Personas fetch failed:", err);
      setPersonas([]);
    } finally {
      setPersonasLoading(false);
    }
  }, [ctxIdForPersonas]);

  useEffect(() => {
    if (!isOpen) return; // only fetch when open
    fetchPersonas();
    const interval = setInterval(fetchPersonas, 30000);
    return () => clearInterval(interval);
  }, [isOpen, fetchPersonas]);

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

  // Chrome skin uses the currently selected context (open) or active context (closed)
  const chromeSkin =
    SkinRegistry[(visible.find((c) => c.id === selectedId)?.skinId ?? "simple") as any];

  const listRef = useRef<Animated.FlatList<Item>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Dock animation: carousel sits more centrally when closed, moves up when open
  const dockY = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  useEffect(() => {
    Animated.timing(dockY, {
      toValue: isOpen ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [isOpen, dockY]);

  const dockTranslateY = dockY.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.max(80, Math.round(SCREEN_H * 0.16)), 0], // tweak to taste
    extrapolate: "clamp",
  });

  const minimal = !isOpen;

  // ✅ Intro header: first entry only, fades away, never when open, never again on back
  const [showIntroHeader, setShowIntroHeader] = useState(false);
  const introOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasShownContextsIntroHeader) return;

    hasShownContextsIntroHeader = true;

    setShowIntroHeader(true);
    introOpacity.setValue(1);

    Animated.timing(introOpacity, {
      toValue: 0,
      duration: 1400,
      delay: 900,
      useNativeDriver: true,
    }).start(() => {
      setShowIntroHeader(false); // remove completely after fade
    });
  }, [introOpacity]);

  useEffect(() => {
    // If user opens a context, hide the intro header immediately
    if (isOpen && showIntroHeader) {
      setShowIntroHeader(false);
      introOpacity.setValue(0);
    }
  }, [isOpen, showIntroHeader, introOpacity]);

  const jumpToIndex = (index: number) => {
    // IMPORTANT: include SIDE padding in the offset
    const offset = SIDE + SNAP * index;
    listRef.current?.scrollToOffset({ offset, animated: false });
  };

  const selectByDataIndex = (dataIndex: number) => {
    const item = (data as any[])[dataIndex] as Item | undefined;
    if (!item) return;

    // swipe selects context
    switchContext(item.id);

    // if panel is open, keep it showing the swiped-to context
    if (isOpen) setOpenContextId(item.id);
  };

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (visible.length <= 1) {
      const only = visible[0];
      if (only) {
        switchContext(only.id);
        if (isOpen) setOpenContextId(only.id);
      }
      return;
    }

    const x = e.nativeEvent.contentOffset.x;

    const effectiveX = Math.max(0, x - SIDE);
    const i = Math.floor((effectiveX + SNAP / 2) / SNAP);

    const lastRealIndex = visible.length;
    const trailingSentinelIndex = lastRealIndex + 1;

    if (i === 0) {
      jumpToIndex(lastRealIndex);
      selectByDataIndex(lastRealIndex);
      return;
    }

    if (i === trailingSentinelIndex) {
      jumpToIndex(1);
      selectByDataIndex(1);
      return;
    }

    selectByDataIndex(i);
  };

  // Tap = open/close only (swipe selects)
  const onPick = (id: number) => {
    const current = selectedId;

    if (isOpen) {
      setOpenContextId(null);
      return;
    }

    // only open the currently selected card
    if (id !== current) return;

    setOpenContextId(current ?? id);
  };

  // Handle adding a context and opening it (even if createContext doesn't return an id)
  const pendingOpenNew = useRef(false);
  const prevVisibleCount = useRef(visible.length);

  const handleViewTasks = (personaId: number) => {
    router.push({ pathname: "/tasks", params: { personaId: String(personaId) } } as any);
  };

  const handleEditPersona = (personaId: number) => {
    router.push({ pathname: "/persona/[personaId]", params: { personaId: String(personaId) } } as any);
  };

  useEffect(() => {
    if (!pendingOpenNew.current) {
      prevVisibleCount.current = visible.length;
      return;
    }

    // Wait for store to update, then open the newest visible context (last by order)
    if (visible.length > prevVisibleCount.current) {
      const newest = visible[visible.length - 1];
      if (newest) {
        switchContext(newest.id);
        setOpenContextId(newest.id);
      }
      pendingOpenNew.current = false;
    }

    prevVisibleCount.current = visible.length;
  }, [visible, switchContext]);

  const onAdd = () => {
    pendingOpenNew.current = true;
    createContext({ name: "New context", skinId: "simple" });
  };

  const openContext = openContextId ? visible.find((c) => c.id === openContextId) : null;

  return (
    <>
      <Stack.Screen options={{ title: "Contexts", headerShown: false }} />

      <View style={[styles.screen, { backgroundColor: chromeSkin.background }]}>
        {/* ✅ Intro header: only on first entry, fades, never when open */}
        {showIntroHeader && !isOpen && (
          <Animated.View style={[styles.header, { opacity: introOpacity }]}>
            <Text style={[styles.title, { color: chromeSkin.text }]}>Contexts</Text>
          </Animated.View>
        )}

        {/* Carousel dock stays above openArea */}
        <Animated.View style={{ transform: [{ translateY: dockTranslateY }] }}>
          <Animated.FlatList
            ref={listRef}
            data={data as any}
            keyExtractor={(item, idx) => `${item.id}-${idx}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={SNAP}
            decelerationRate="fast"
            bounces={false}
            onMomentumScrollEnd={handleMomentumEnd}
            initialScrollIndex={visible.length > 1 ? 1 : 0}
            getItemLayout={(_, index) => ({
              length: SNAP,
              offset: SIDE + SNAP * index,
              index,
            })}
            onScrollToIndexFailed={() => {
              requestAnimationFrame(() => {
                if (visible.length > 1) jumpToIndex(1);
              });
            }}
            contentContainerStyle={{
              paddingHorizontal: SIDE,
              paddingVertical: minimal ? 6 : 10,
            }}
            ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
              useNativeDriver: true,
            })}
            scrollEventThrottle={16}
            renderItem={({ item, index }) => {
              const skin = SkinRegistry[item.skinId];
              const cardHeight = isOpen ? openCardHeight : closedCardHeight;

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

              return (
                <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
                  <Pressable
                    onPress={() => onPick(item.id)}
                    style={[
                      styles.cardInner,
                      {
                        // palette-aware “surface” and border
                        backgroundColor: skin.surface ?? skin.background,
                        minHeight: cardHeight,
                        justifyContent: "center",
                        padding: isOpen ? 12 : 18,
                        borderRadius: isOpen ? 16 : 22,
                        borderWidth: 2,
                        borderColor: skin.muted ?? skin.text,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cardTitleMinimal,
                        {
                          color: skin.text,
                          fontSize: isOpen ? 18 : 28,
                          textAlign: "center",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            }}
          />
        </Animated.View>

        {isOpen && (
          <View
            style={[
              styles.personaPanel,
              { backgroundColor: chromeSkin.surface ?? "rgba(255,255,255,0.06)" },
            ]}
          >
            {personasLoading ? (
              <View style={{ paddingTop: 18, alignItems: "center" }}>
                <ActivityIndicator />
                <Text style={{ color: chromeSkin.muted, marginTop: 10 }}>Loading personas…</Text>
              </View>
            ) : (
              <FlatList
                data={personas}
                keyExtractor={(p) => String(p.id)}
                contentContainerStyle={{ paddingVertical: 6 }}
                renderItem={({ item }) => (
                  <View style={[styles.personaRow, { borderColor: chromeSkin.muted ?? chromeSkin.text }]}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => handleEditPersona(item.id)}>
                      <Text style={{ color: chromeSkin.text, fontWeight: "800" }} numberOfLines={1}>
                        {item.display_name}
                      </Text>
                      <Text style={{ color: chromeSkin.muted, marginTop: 2, fontSize: 12 }}>
                        {item.task_count} tasks
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleViewTasks(item.id)} style={styles.personaIconBtn}>
                      <Ionicons name="list-outline" size={22} color={chromeSkin.text} />
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={{ color: chromeSkin.muted, paddingTop: 14 }}>
                    No personas yet.
                  </Text>
                }
              />
            )}
          </View>
        )}

        {/* Floating Add Context button */}
        <Pressable onPress={onAdd} style={[styles.fab, { backgroundColor: chromeSkin.accent }]}>
          <Text style={styles.fabPlus}>+</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 64 },

  header: { paddingHorizontal: 16, paddingBottom: 10 },
  title: { fontSize: 18, fontWeight: "700" },

  card: { width: CARD_W },
  cardInner: {
    borderRadius: 22,
    overflow: "hidden",
    padding: 18,
  },
  cardTitleMinimal: {
    fontWeight: "900",
    textAlign: "center",
  },

  openHeaderPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    gap: 10,
    marginBottom: 12,
  },
  openHeaderDot: { width: 10, height: 10, borderRadius: 5 },
  openHeaderText: { fontSize: 16, fontWeight: "900" },

  openArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
  },

  personaPanel: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6,
  },
  fabPlus: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0B0C10",
    lineHeight: 34,
  },

  personaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },

  personaIconBtn: {
    padding: 8,
  },
});
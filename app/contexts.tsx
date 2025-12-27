import { useContextStore } from "@/state/ContextStore";
import { SkinRegistry } from "@/state/skins";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";

export default function Contexts() {
  const router = useRouter();
  const { contexts, activeContextId, switchContext, createContext } = useContextStore();

  const skin = SkinRegistry.simple;

  const visible = contexts
    .filter((c) => !c.isDeleted && !c.isArchived)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  return (
    <>
      <Stack.Screen options={{ title: "Contexts" }} />
      <View style={{ flex: 1, backgroundColor: skin.background, padding: 16, paddingTop: 60 }}>
        <Text style={{ color: skin.text, fontSize: 22, fontWeight: "700", marginBottom: 8 }}>
          Choose a context
        </Text>
        <Text style={{ color: skin.muted, marginBottom: 14 }}>
          Veemee waits for you before it supports you.
        </Text>

        <FlatList
          data={visible}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                switchContext(item.id);
                router.replace("/dashboard");
              }}
              style={{
                backgroundColor: item.id === activeContextId ? "rgba(122,162,255,0.18)" : skin.surface,
                padding: 14,
                borderRadius: 16,
              }}
            >
              <Text style={{ color: skin.text, fontSize: 16, fontWeight: "700" }}>{item.name}</Text>
              <Text style={{ color: skin.muted, marginTop: 4, fontSize: 12 }}>Skin: {item.skinId}</Text>
            </Pressable>
          )}
        />

        <Pressable
          onPress={() => {
            createContext({ name: "New context" });
            router.replace("/dashboard");
          }}
          style={{
            marginTop: 14,
            backgroundColor: skin.accent,
            padding: 14,
            borderRadius: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#0B0C10", fontWeight: "800" }}>+ Add context</Text>
        </Pressable>
      </View>
    </>
  );
}
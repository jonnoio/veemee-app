import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { API_BASE } from "@/config/api";

type Project = {
  id: number;
  persona_id: number;
  name: string;
  description?: string | null;
  order_index?: number | null;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{children}</Text>;
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...props}
      style={[
        { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
        props.style,
      ]}
    />
  );
}

function normText(s: string): string | null {
  const v = s.trim();
  return v ? v : null;
}

function normInt(s: string): number {
  const v = s.trim();
  if (!v) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function EditProject() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const id = useMemo(() => Number(projectId), [projectId]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [original, setOriginal] = useState<Project | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [orderIndex, setOrderIndex] = useState("");

  const dirty = useMemo(() => {
    if (!original) return false;
    const origDesc = original.description ?? "";
    const origOi = String(original.order_index ?? 0);

    return (
      name !== original.name ||
      description !== origDesc ||
      orderIndex !== origOi
    );
  }, [original, name, description, orderIndex]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      if (!Number.isFinite(id) || id <= 0) {
        setError("Invalid projectId");
        setLoading(false);
        return;
      }

      const token = await SecureStore.getItemAsync("veemee-jwt");
      if (!token) {
        router.replace("/auth");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/project/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!alive) return;

        if (res.status === 401) {
          await SecureStore.deleteItemAsync("veemee-jwt");
          router.replace("/auth");
          return;
        }

        if (!res.ok) {
          const msg = await res.text();
          setError(msg || "Failed to load project");
          setLoading(false);
          return;
        }

        const json = (await res.json()) as { project: Project };
        const p = json.project;

        setOriginal(p);
        setName(p.name ?? "");
        setDescription(p.description ?? "");
        setOrderIndex(String(p.order_index ?? 0));

        setLoading(false);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load project");
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [id, router]);

  function buildPatch(orig: Project) {
    const patch: Record<string, any> = {};

    if (name !== orig.name) patch.name = name.trim();
    if (description !== (orig.description ?? "")) patch.description = normText(description);

    const oi = normInt(orderIndex);
    if (oi !== (orig.order_index ?? 0)) patch.order_index = oi;

    return patch;
  }

  async function onSave() {
    if (!original) return;

    if (!name.trim()) {
      Alert.alert("Project name is required");
      return;
    }

    const patch = buildPatch(original);
    if (Object.keys(patch).length === 0) {
      router.back();
      return;
    }

    setSaving(true);
    setError(null);

    const token = await SecureStore.getItemAsync("veemee-jwt");
    if (!token) {
      setSaving(false);
      router.replace("/auth");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/project/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });

      if (res.status === 401) {
        await SecureStore.deleteItemAsync("veemee-jwt");
        setSaving(false);
        router.replace("/auth");
        return;
      }

      if (!res.ok) {
        const msg = await res.text();
        setSaving(false);
        setError(msg || "Failed to save project");
        return;
      }

      const json = (await res.json()) as { project: Project };
      setOriginal(json.project);
      setSaving(false);

      Alert.alert("Saved");
      router.back();
    } catch (e: any) {
      setSaving(false);
      setError(e?.message || "Failed to save project");
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: "Edit Project", headerShown: false }} />

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 10, opacity: 0.7 }}>Loading…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {error ? (
            <View style={{ padding: 12, borderWidth: 1, borderRadius: 12 }}>
              <Text style={{ fontWeight: "600", marginBottom: 6 }}>Error</Text>
              <Text style={{ opacity: 0.85 }}>{error}</Text>
            </View>
          ) : null}

          <View style={{ gap: 8 }}>
            <FieldLabel>Name</FieldLabel>
            <Input value={name} onChangeText={setName} placeholder="Project name" />
          </View>

          <View style={{ gap: 8 }}>
            <FieldLabel>Description</FieldLabel>
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder="Optional"
              multiline
              style={{ minHeight: 110, textAlignVertical: "top" }}
            />
          </View>

          <View style={{ gap: 8 }}>
            <FieldLabel>Order index</FieldLabel>
            <Input
              value={orderIndex}
              onChangeText={setOrderIndex}
              placeholder="Optional (number)"
              keyboardType="number-pad"
            />
          </View>

          <Pressable
            onPress={onSave}
            disabled={!dirty || saving}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
              borderWidth: 1,
              opacity: !dirty || saving ? 0.5 : 1,
              alignItems: "center",
              marginTop: 6,
            }}
          >
            <Text style={{ fontSize: 16 }}>{saving ? "Saving…" : "Save"}</Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
              borderWidth: 1,
              alignItems: "center",
              opacity: 0.75,
            }}
          >
            <Text style={{ fontSize: 16 }}>Cancel</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}
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

type Action = {
  id: number;
  task_id: number;
  name: string;
  status: "todo" | "done" | string;
  due_date?: string | null; // ISO, edit as YYYY-MM-DD
  estimated_minutes?: number | null;

  recurrence?: string | null;
  recurrence_days?: string | null; // assuming text/CSV
  recurrence_dom?: number | null;
  recurrence_interval?: number | null;
  notes?: string | null;
};

type GetActionResponse = { action: Action };
type SaveActionResponse = { action: Action };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
      {children}
    </Text>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...props}
      style={[
        {
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
          fontSize: 16,
        },
        props.style,
      ]}
    />
  );
}

function Chip({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        opacity: selected ? 1 : 0.55,
      }}
    >
      <Text style={{ fontSize: 14 }}>{title}</Text>
    </Pressable>
  );
}

function normText(s: string): string | null {
  const v = s.trim();
  return v ? v : null;
}
function normInt(s: string): number | null {
  const v = s.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function EditAction() {
  const { actionId } = useLocalSearchParams<{ actionId: string }>();
  const id = useMemo(() => Number(actionId), [actionId]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [original, setOriginal] = useState<Action | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string>("todo");
  const [dueDate, setDueDate] = useState(""); // YYYY-MM-DD
  const [estimatedMinutes, setEstimatedMinutes] = useState(""); // numeric string

  const [recurrence, setRecurrence] = useState("");
  const [recurrenceDays, setRecurrenceDays] = useState("");
  const [recurrenceDom, setRecurrenceDom] = useState(""); // numeric string
  const [recurrenceInterval, setRecurrenceInterval] = useState(""); // numeric string
  const [notes, setNotes] = useState("");

  const dirty = useMemo(() => {
    if (!original) return false;

    const origDue = (original.due_date ?? "").slice(0, 10);
    const origEst = original.estimated_minutes == null ? "" : String(original.estimated_minutes);
    const origDom = original.recurrence_dom == null ? "" : String(original.recurrence_dom);
    const origInt = original.recurrence_interval == null ? "" : String(original.recurrence_interval);

    return (
      name !== (original.name ?? "") ||
      status !== (original.status ?? "todo") ||
      dueDate !== origDue ||
      estimatedMinutes !== origEst ||
      recurrence !== (original.recurrence ?? "") ||
      recurrenceDays !== (original.recurrence_days ?? "") ||
      recurrenceDom !== origDom ||
      recurrenceInterval !== origInt ||
      notes !== (original.notes ?? "")
    );
  }, [
    original,
    name,
    status,
    dueDate,
    estimatedMinutes,
    recurrence,
    recurrenceDays,
    recurrenceDom,
    recurrenceInterval,
    notes,
  ]);

  const router = useRouter();

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      if (!Number.isFinite(id) || id <= 0) {
        setError("Invalid actionId");
        setLoading(false);
        return;
      }

      const token = await SecureStore.getItemAsync("veemee-jwt");
      if (!token) {
        router.replace("/auth");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/action/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          await SecureStore.deleteItemAsync("veemee-jwt");
          router.replace("/auth");
          return;
        }

        if (!res.ok) {
          setError(await res.text());
          setLoading(false);
          return;
        }

        const json = (await res.json()) as { action: Action };
        if (!alive) return;

        const a = json.action;
        setOriginal(a);

        setName(a.name ?? "");
        setStatus(a.status ?? "todo");
        setDueDate((a.due_date ?? "").slice(0, 10));
        setEstimatedMinutes(a.estimated_minutes == null ? "" : String(a.estimated_minutes));
        setRecurrence(a.recurrence ?? "");
        setRecurrenceDays(a.recurrence_days ?? "");
        setRecurrenceDom(a.recurrence_dom == null ? "" : String(a.recurrence_dom));
        setRecurrenceInterval(a.recurrence_interval == null ? "" : String(a.recurrence_interval));
        setNotes(a.notes ?? "");

        setLoading(false);
      } catch (e: any) {
        setError(e?.message || "Failed to load action");
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [id, router]);

  function buildPatch(orig: Action) {
    const patch: Record<string, any> = {};

    const origDue = (orig.due_date ?? "").slice(0, 10);
    const curDue = dueDate.trim();

    if (name !== (orig.name ?? "")) patch.name = name.trim();
    if (status !== (orig.status ?? "todo")) patch.status = status.trim() || "todo";
    if (curDue !== origDue) patch.due_date = normText(curDue);

    const curEst = normInt(estimatedMinutes);
    if (curEst !== (orig.estimated_minutes ?? null)) patch.estimated_minutes = curEst;

    if (recurrence !== (orig.recurrence ?? "")) patch.recurrence = normText(recurrence);
    if (recurrenceDays !== (orig.recurrence_days ?? "")) patch.recurrence_days = normText(recurrenceDays);

    const curDom = normInt(recurrenceDom);
    if (curDom !== (orig.recurrence_dom ?? null)) patch.recurrence_dom = curDom;

    const curInt = normInt(recurrenceInterval);
    if (curInt !== (orig.recurrence_interval ?? null)) patch.recurrence_interval = curInt;

    if (notes !== (orig.notes ?? "")) patch.notes = normText(notes);

    return patch;
  }

  async function onSave() {
    if (!original) return;

    if (!name.trim()) {
      Alert.alert("Action name is required");
      return;
    }

    const dd = dueDate.trim();
    if (dd && !/^\d{4}-\d{2}-\d{2}$/.test(dd)) {
      Alert.alert("Due date must be YYYY-MM-DD");
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
      router.replace("/auth");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/actions/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });

      if (res.status === 401) {
        await SecureStore.deleteItemAsync("veemee-jwt");
        router.replace("/auth");
        return;
      }

      if (!res.ok) {
        setError(await res.text());
        setSaving(false);
        return;
      }

      const json = (await res.json()) as { action: Action };
      setOriginal(json.action);

      setSaving(false);
      Alert.alert("Saved");
      router.back();
    } catch (e: any) {
      setSaving(false);
      setError(e?.message || "Failed to save action");
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: "Edit Action",
          headerShown: false,
          headerRight: () => (
            <Pressable
              onPress={onSave}
              disabled={!dirty || saving || loading}
              style={{ opacity: !dirty || saving || loading ? 0.4 : 1 }}
            >
              <Text style={{ fontSize: 16 }}>{saving ? "Saving…" : "Save"}</Text>
            </Pressable>
          ),
        }}
      />

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
            <Input value={name} onChangeText={setName} placeholder="Action name" />
          </View>

          <View style={{ gap: 8 }}>
            <FieldLabel>Status</FieldLabel>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Chip title="Todo" selected={status === "todo"} onPress={() => setStatus("todo")} />
              <Chip title="Done" selected={status === "done"} onPress={() => setStatus("done")} />
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <FieldLabel>Due date</FieldLabel>
            <Input value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
          </View>

          <View style={{ gap: 8 }}>
            <FieldLabel>Estimated minutes</FieldLabel>
            <Input
              value={estimatedMinutes}
              onChangeText={setEstimatedMinutes}
              placeholder="Optional (number)"
              keyboardType="number-pad"
            />
          </View>

          <View style={{ gap: 8 }}>
            <FieldLabel>Recurrence</FieldLabel>
            <Input
              value={recurrence}
              onChangeText={setRecurrence}
              placeholder="e.g. daily / weekly / monthly"
              autoCapitalize="none"
            />
          </View>

          <View style={{ gap: 8 }}>
            <FieldLabel>Recurrence days</FieldLabel>
            <Input
              value={recurrenceDays}
              onChangeText={setRecurrenceDays}
              placeholder='e.g. "1,3,5" (Mon/Wed/Fri)'
              autoCapitalize="none"
            />
          </View>

          <View style={{ gap: 8 }}>
            <FieldLabel>Recurrence day-of-month</FieldLabel>
            <Input
              value={recurrenceDom}
              onChangeText={setRecurrenceDom}
              placeholder="Optional (number)"
              keyboardType="number-pad"
            />
          </View>

          <View style={{ gap: 8 }}>
            <FieldLabel>Recurrence interval</FieldLabel>
            <Input
              value={recurrenceInterval}
              onChangeText={setRecurrenceInterval}
              placeholder="Optional (number)"
              keyboardType="number-pad"
            />
          </View>

          <View style={{ gap: 8 }}>
            <FieldLabel>Notes</FieldLabel>
            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional"
              multiline
              style={{ minHeight: 110, textAlignVertical: "top" }}
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
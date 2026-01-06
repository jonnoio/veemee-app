// app/persona/[personaId]/overview.tsx
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { API_BASE } from "@/config/api";
import { useAuth } from "@/lib/useAuth";
import { useContextStore } from "@/state/ContextStore";
import { SkinRegistry } from "@/state/skins";

type ActionRow = {
  id: number;
  name: string;
  status: "todo" | "doing" | "done";
  due_date: string | null; // ISO
  deleted_at: string | null;
  estimated_minutes: number | null;
};

type TaskRow = {
  id: number;
  name: string;
  status: "todo" | "doing" | "done";
  due_date: string | null; // ISO
  deleted_at: string | null;
  is_archived: boolean;
  category: string | null;
  estimated_minutes: number | null;
  actions: ActionRow[];
};

type ProjectRow = {
  id: number | null;
  group_id: number;
  name: string;
  description: string | null;
  order_index: number;
  is_archived: boolean;
  deleted_at: string | null;
  tasks: TaskRow[];
};

type OverviewResponse = {
  persona: { id: number; name: string };
  filters: { view: string; show_done: boolean; due: string; q: string };
  overview: { projects: ProjectRow[] };
};

function fmtDue(iso: string | null) {
  if (!iso) return "";
  // iso might be "2026-01-06" or full datetime
  try {
    const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
    // keep it simple
    return d.toISOString().slice(0, 10);
  } catch {
    return String(iso);
  }
}

export default function PersonaOverviewScreen() {
  const router = useRouter();
  const { personaId: raw } = useLocalSearchParams();
  const personaId = Number(typeof raw === "string" ? raw : "");
  const { status } = useAuth();

  const { activeContext } = useContextStore();
  const skin = SkinRegistry[activeContext?.skinId ?? "simple"];

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [err, setErr] = useState<string>("");

  // expand/collapse state
  const [openProjects, setOpenProjects] = useState<Record<number, boolean>>({});
  const [openTasks, setOpenTasks] = useState<Record<number, boolean>>({});

  const toggleProject = (groupId: number) =>
    setOpenProjects((p) => ({ ...p, [groupId]: !p[groupId] }));

  const toggleTask = (taskId: number) =>
    setOpenTasks((p) => ({ ...p, [taskId]: !p[taskId] }));

  const fetchOverview = useCallback(async () => {
    if (!personaId || Number.isNaN(personaId)) {
      setErr("Missing personaId");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr("");

    const token = await SecureStore.getItemAsync("veemee-jwt");
    if (!token) {
      router.replace("/auth");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/personas/${personaId}/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        await SecureStore.deleteItemAsync("veemee-jwt");
        router.replace("/auth");
        return;
      }

      const text = await res.text();
      const json = JSON.parse(text) as OverviewResponse;
      setData(json);

      // default expand: open first project
      const first = json?.overview?.projects?.[0];
      if (first) setOpenProjects((p) => ({ ...p, [first.group_id]: true }));
    } catch (e: any) {
      setErr(e?.message || "Failed to load overview");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [personaId, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchOverview();
  }, [status, fetchOverview]);

  const title = data?.persona?.name ?? "Overview";
  const projects = useMemo(() => data?.overview?.projects ?? [], [data]);

  return (
    <>
      <Stack.Screen options={{ title, headerShown: false }} />

      <View style={[styles.screen, { backgroundColor: skin.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderColor: skin.muted }]}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <Text style={{ color: skin.text }}>←</Text>
          </Pressable>
          <Text style={[styles.h1, { color: skin.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Pressable onPress={fetchOverview} style={styles.headerBtn}>
            <Text style={{ color: skin.text }}>↻</Text>
          </Pressable>
        </View>

        {status !== "authenticated" ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={{ color: skin.muted, marginTop: 10 }}>
              Checking login…
            </Text>
          </View>
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={{ color: skin.muted, marginTop: 10 }}>
              Loading overview…
            </Text>
          </View>
        ) : err ? (
          <View style={styles.center}>
            <Text style={{ color: "tomato" }}>{err}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {projects.map((p) => {
              const isProjectOpen = !!openProjects[p.group_id];
              const taskCount = p.tasks?.length ?? 0;
              const actionCount =
                p.tasks?.reduce((sum, t) => sum + (t.actions?.length ?? 0), 0) ?? 0;

              return (
                <View key={`p-${p.group_id}`} style={[styles.card, { backgroundColor: skin.surface }]}>
                  {/* Project row */}
                  <Pressable onPress={() => toggleProject(p.group_id)} style={styles.row}>
                    <Text style={[styles.rowTitle, { color: skin.text }]} numberOfLines={1}>
                      {isProjectOpen ? "▾ " : "▸ "}
                      {p.name}
                    </Text>
                    <Text style={{ color: skin.muted, fontSize: 12 }}>
                      {taskCount} tasks · {actionCount} actions
                    </Text>
                  </Pressable>

                  {/* Project actions */}
                  <View style={styles.rowActions}>
                    <Pressable style={[styles.pill, { borderColor: skin.muted }]}>
                      <Text style={{ color: skin.text, fontSize: 12 }}>Edit</Text>
                    </Pressable>
                    <Pressable style={[styles.pill, { borderColor: skin.muted }]}>
                      <Text style={{ color: skin.text, fontSize: 12 }}>Delete</Text>
                    </Pressable>
                  </View>

                  {/* Tasks */}
                  {isProjectOpen &&
                    (p.tasks ?? []).map((t) => {
                      const isTaskOpen = !!openTasks[t.id];
                      return (
                        <View key={`t-${t.id}`} style={[styles.nested, { borderColor: skin.muted }]}>
                          <Pressable onPress={() => toggleTask(t.id)} style={styles.row}>
                            <Text style={[styles.rowTitle, { color: skin.text }]} numberOfLines={1}>
                              {isTaskOpen ? "▾ " : "▸ "}
                              {t.name}
                            </Text>
                            <Text style={{ color: skin.muted, fontSize: 12 }}>
                              {t.status}
                              {t.due_date ? ` · due ${fmtDue(t.due_date)}` : ""}
                            </Text>
                          </Pressable>

                          <View style={styles.rowActions}>
                            <Pressable style={[styles.pill, { borderColor: skin.muted }]}>
                              <Text style={{ color: skin.text, fontSize: 12 }}>Done</Text>
                            </Pressable>
                            <Pressable style={[styles.pill, { borderColor: skin.muted }]}>
                              <Text style={{ color: skin.text, fontSize: 12 }}>Timer</Text>
                            </Pressable>
                            <Pressable style={[styles.pill, { borderColor: skin.muted }]}>
                              <Text style={{ color: skin.text, fontSize: 12 }}>Edit</Text>
                            </Pressable>
                            <Pressable style={[styles.pill, { borderColor: skin.muted }]}>
                              <Text style={{ color: skin.text, fontSize: 12 }}>Delete</Text>
                            </Pressable>
                          </View>

                          {isTaskOpen &&
                            (t.actions ?? []).map((a) => (
                              <View key={`a-${a.id}`} style={[styles.actionRow, { borderColor: skin.muted }]}>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: skin.text }} numberOfLines={2}>
                                    • {a.name}
                                  </Text>
                                  <Text style={{ color: skin.muted, fontSize: 12 }}>
                                    {a.status}
                                    {a.due_date ? ` · due ${fmtDue(a.due_date)}` : ""}
                                  </Text>
                                </View>

                                <View style={{ flexDirection: "row", gap: 8 }}>
                                  <Pressable style={[styles.pill, { borderColor: skin.muted }]}>
                                    <Text style={{ color: skin.text, fontSize: 12 }}>Done</Text>
                                  </Pressable>
                                  <Pressable style={[styles.pill, { borderColor: skin.muted }]}>
                                    <Text style={{ color: skin.text, fontSize: 12 }}>⏱</Text>
                                  </Pressable>
                                </View>
                              </View>
                            ))}
                        </View>
                      );
                    })}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
  },
  headerBtn: { padding: 10 },
  h1: { flex: 1, fontSize: 18, fontWeight: "900" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  content: { padding: 14, paddingBottom: 80, gap: 12 },

  card: {
    borderRadius: 16,
    padding: 12,
  },
  row: { gap: 4 },
  rowTitle: { fontSize: 15, fontWeight: "900" },

  rowActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    marginBottom: 6,
  },

  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  nested: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },

  actionRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
});
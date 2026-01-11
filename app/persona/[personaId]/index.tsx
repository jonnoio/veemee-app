// app/persona/[personaId]/index.tsx
import { Ionicons } from "@expo/vector-icons";
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

function metaLine(due: string | null, mins: number | null) {
  const bits: string[] = [];
  if (due) bits.push(`due ${fmtDue(due)}`);
  if (typeof mins === "number") bits.push(`${mins}m`);
  return bits.length ? bits.join(" · ") : "";
}

export default function PersonaOverviewScreen() {

  const router = useRouter();
  const { personaId: raw } = useLocalSearchParams();
  const personaId = Number(Array.isArray(raw) ? raw[0] : raw);
  const { status } = useAuth();

  const { activeContext } = useContextStore();
  const skin = SkinRegistry[activeContext?.skinId ?? "simple"];

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [err, setErr] = useState<string>("");

  // expand/collapse state
  const [openProjects, setOpenProjects] = useState<Record<number, boolean>>({});
  const [openTasks, setOpenTasks] = useState<Record<number, boolean>>({});

  const updateTaskInState = useCallback((taskId: number, patch: Partial<TaskRow>) => {
    setData((prev: OverviewResponse | null): OverviewResponse | null => {
      if (!prev) return null;

      const nextProjects = prev.overview.projects.map((p) => ({
        ...p,
        tasks: (p.tasks ?? []).map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
      }));

      return {
        ...prev,
        overview: {
          ...prev.overview,
          projects: nextProjects,
        },
      };
    });
  }, []);

  const updateActionInState = useCallback((actionId: number, patch: Partial<ActionRow>) => {
    setData((prev: OverviewResponse | null): OverviewResponse | null => {
      if (!prev) return null;

      const nextProjects = prev.overview.projects.map((p) => ({
        ...p,
        tasks: (p.tasks ?? []).map((t) => ({
          ...t,
          actions: (t.actions ?? []).map((a) => (a.id === actionId ? { ...a, ...patch } : a)),
        })),
      }));

      return {
        ...prev,
        overview: {
          ...prev.overview,
          projects: nextProjects,
        },
      };
    });
  }, []);

  const toggleProject = (groupId: number) =>
    setOpenProjects((p) => ({ ...p, [groupId]: !p[groupId] }));

  const toggleTask = (taskId: number) =>
    setOpenTasks((p) => ({ ...p, [taskId]: !p[taskId] }));
  
  const toggleDoneAction = useCallback(
    async (action: ActionRow) => {
      const token = await SecureStore.getItemAsync("veemee-jwt");
      if (!token) {
        router.replace("/auth");
        return;
      }

      // optimistic UI
      const prevStatus = action.status;
      const optimistic = prevStatus === "done" ? "todo" : "done";
      updateActionInState(action.id, { status: optimistic as any });

      try {
        const res = await fetch(`${API_BASE}/api/actions/${action.id}/toggle`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          await SecureStore.deleteItemAsync("veemee-jwt");
          router.replace("/auth");
          return;
        }

        if (!res.ok) {
          // revert
          updateActionInState(action.id, { status: prevStatus });
          const msg = await res.text();
          console.log("toggle action failed", msg);
          return;
        }

        const json = (await res.json()) as { id: number; status: ActionRow["status"] };
        updateActionInState(action.id, { status: json.status });
      } catch (e) {
        // revert
        updateActionInState(action.id, { status: prevStatus });
        console.log(e);
      }
    },
    [router, updateActionInState]
  );
  
  const toggleTimerAction = useCallback(
    async (action: ActionRow) => {
      const token = await SecureStore.getItemAsync("veemee-jwt");
      if (!token) {
        router.replace("/auth");
        return;
      }

      try {
        const res = await fetch(
          `${API_BASE}/api/actions/${action.id}/toggle_timer`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.status === 401) {
          await SecureStore.deleteItemAsync("veemee-jwt");
          router.replace("/auth");
          return;
        }

        if (!res.ok) {
          const msg = await res.text();
          console.log("toggleTimerAction failed", msg);
          return;
        }

        const json = await res.json();
        // json.state is "running" or "stopped"
        console.log("action timer state:", json.state, "log:", json.log_id);

        // Optional: you can show a quick toast/alert later.
        // For now you can also trigger a refresh if you want:
        // fetchOverview();
      } catch (e) {
        console.log(e);
      }
    },
    [router]
  );

  const toggleDoneTask = useCallback(
    async (task: TaskRow) => {
      const token = await SecureStore.getItemAsync("veemee-jwt");
      if (!token) {
        router.replace("/auth");
        return;
      }

      const prevStatus = task.status;
      const optimistic = prevStatus === "done" ? "todo" : "done";

      // optimistic UI
      updateTaskInState(task.id, { status: optimistic as any });

      try {
        const res = await fetch(`${API_BASE}/api/tasks/${task.id}/toggle`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          await SecureStore.deleteItemAsync("veemee-jwt");
          router.replace("/auth");
          return;
        }

        if (!res.ok) {
          updateTaskInState(task.id, { status: prevStatus });
          console.log("toggleDoneTask failed:", await res.text());
          return;
        }

        const json = (await res.json()) as { new_status: TaskRow["status"] };
        updateTaskInState(task.id, { status: json.new_status as any });
      } catch (e) {
        updateTaskInState(task.id, { status: prevStatus });
        console.log(e);
      }
    },
    [router, updateTaskInState]
  );

  const toggleTimerTask = useCallback(
    async (task: TaskRow) => {
      const token = await SecureStore.getItemAsync("veemee-jwt");
      if (!token) {
        router.replace("/auth");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/tasks/${task.id}/toggle_timer`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          await SecureStore.deleteItemAsync("veemee-jwt");
          router.replace("/auth");
          return;
        }

        if (!res.ok) {
          console.log("toggleTimerTask failed:", await res.text());
          return;
        }

        const json = await res.json();
        // expected: { state: "running"|"stopped", task_id, log_id, ... }
        console.log("task timer:", json.state, "task:", task.id, "log:", json.log_id);

        // Optional: if you want the overview to reflect timer changes immediately:
        // fetchOverview();
      } catch (e) {
        console.log(e);
      }
    },
    [router] // add fetchOverview here too if you uncomment it above
  );

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
      setOpenProjects({});
      setOpenTasks({});

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
                  <View
                    key={`p-${p.group_id}`}
                    style={[
                      styles.projectCard,
                      {
                        backgroundColor: skin.surface,
                        borderColor: skin.muted,
                      },
                    ]}
                  >
                  {/* Project row */}
                  <View style={[styles.projectHeaderRow]}>
                    <View style={[styles.projectAccent, { backgroundColor: skin.accent }]} />
                    {/* Left: expand/collapse */}
                    <Pressable onPress={() => toggleProject(p.group_id)} style={styles.iconHit}>
                      <Ionicons
                        name={isProjectOpen ? "chevron-down" : "chevron-forward"}
                        size={18}
                        color={skin.text}
                      />
                    </Pressable>

                    {/* Middle: name = edit */}
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/project/[projectId]/edit",
                          params: { projectId: String(p.id ?? "") }, // or group_id if you need
                        } as any)
                      }
                      style={{ flex: 1 }}
                    >
                      <Text style={[styles.projectTitle, { color: skin.text }]} numberOfLines={1}>
                          {p.name}
                      </Text>
                      <Text style={{ color: skin.muted, fontSize: 12 }}>
                        {taskCount} tasks · {actionCount} actions
                      </Text>
                    </Pressable>
                    {/* Right: placeholder for future actions */}
                  </View>

                  {/* Tasks */}
                  {isProjectOpen &&
                    (p.tasks ?? []).map((t) => {
                      const isTaskOpen = !!openTasks[t.id];

                      const nameStyle = [
                        styles.taskTitle,
                        { color: skin.text },
                        t.deleted_at ? { textDecorationLine: "line-through", opacity: 0.45 } : null,
                        t.is_archived ? { opacity: 0.65 } : null,
                      ];

                      return (
                        <View
                          key={`t-${t.id}`}
                          style={[
                            styles.taskBlock,
                            { borderLeftColor: skin.muted, borderTopColor: skin.muted },
                          ]}
                        >
                          <View style={styles.taskHeaderRow}>
                            <Pressable onPress={() => toggleTask(t.id)} style={styles.iconHit}>
                              <Ionicons
                                name={isTaskOpen ? "chevron-down" : "chevron-forward"}
                                size={18}
                                color={skin.text}
                              />
                            </Pressable>

                            <Pressable
                              onPress={() =>
                                router.push({
                                  pathname: "/task/[taskId]/edit",
                                  params: { taskId: String(t.id) },
                                } as any)
                              }
                              style={{ flex: 1 }}
                            >
                              <Text style={nameStyle} numberOfLines={1}>
                                {t.is_archived ? `(${t.name})` : t.name}
                              </Text>
                              {(() => {
                                const meta = metaLine(t.due_date, t.estimated_minutes);
                                return meta ? <Text style={{ color: skin.muted, fontSize: 12 }}>{meta}</Text> : null;
                              })()}
                            </Pressable>

                            <Pressable onPress={() => toggleTimerTask(t)} style={styles.iconHit}>
                              <Ionicons name="timer-outline" size={18} color={skin.text} />
                            </Pressable>

                            <Pressable onPress={() => toggleDoneTask(t)} style={styles.iconHit}>
                                <Ionicons
                                name={t.status === "done" ? "checkmark-circle" : "checkmark-circle-outline"}
                                size={18}
                                color={skin.text}
                              />
                            </Pressable>
                          </View>
                          {isTaskOpen &&
                            (t.actions ?? []).map((a) => (
                              <View key={`a-${a.id}`} style={[styles.actionRow, { borderColor: skin.muted }]}>

                                <Pressable
                                  onPress={() =>
                                    router.push({
                                      pathname: "/action/[actionId]/edit",
                                      params: { actionId: String(a.id) },
                                    } as any)
                                  }
                                  style={{ flex: 1 }}
                                >
                                  <Text style={{ color: skin.text }} numberOfLines={2}>
                                    • {a.name}
                                  </Text>
                                  {(() => {
                                    const meta = metaLine(a.due_date, a.estimated_minutes);
                                    return meta ? (
                                      <Text style={{ color: skin.muted, fontSize: 12 }}>{meta}</Text>
                                    ) : null;
                                  })()}
                                </Pressable>

                                <View style={{ flexDirection: "row" }}>

                                  <Pressable onPress={() => toggleTimerAction(a)} style={styles.iconHit}>
                                    <Ionicons name="timer-outline" size={18} color={skin.text} />
                                  </Pressable>

                                  <Pressable onPress={() => toggleDoneAction(a)} style={styles.iconHit}>
                                    <Ionicons
                                      name={a.status === "done" ? "checkmark-circle" : "checkmark-circle-outline"}
                                      size={18}
                                      color={skin.text}
                                    />
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

  rowTitle: { fontSize: 15, fontWeight: "900" },

  actionRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginLeft: 18, 
  },

  iconHit: {
    padding: 10,
    borderRadius: 999,
  },

  projectHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
  },

  taskHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },

  projectTitle: { fontSize: 14, fontWeight: "800" },
  taskTitle: { fontSize: 14, fontWeight: "800" },
  actionTitle: { fontSize: 14, fontWeight: "800" },
  deleted: { textDecorationLine: "line-through", opacity: 0.45 },
  archived: { opacity: 0.65 },

  projectCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },

  projectAccent: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 999,
    marginRight: 8,
  },

  taskBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    marginLeft: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
  },

});
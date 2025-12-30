import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type SkinId = "simple" | "geo" | "tide";

export type ContextRow = {
  id: number;
  name: string;
  skinId: SkinId;
  order?: number;

  isArchived: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  deletedFromState?: "active" | "archived";
};

export type Persona = {
  id: number;
  display_name: string;
  slug: string;
  task_count: number;
  context_id?: number;
};

export type WastebasketPolicy = { retentionDays: number | null };

const API_BASE = "https://veemee.onrender.com";

type Store = {
  hydrated: boolean;

  activeContextId: number | null;
  contexts: ContextRow[];
  wastebasketPolicy: WastebasketPolicy;

  activeContext: ContextRow | null;

  switchContext(id: number): void;

  createContext(input: { name: string; skinId?: SkinId; order?: number }): number;
  updateContext(id: number, patch: Partial<Omit<ContextRow, "id">>): void;

  archiveContext(id: number): void;
  unarchiveContext(id: number): void;

  deleteContext(id: number): void; // soft delete -> wastebasket
  restoreContext(id: number): void;
  purgeContext(id: number): void;

  setWastebasketPolicy(p: WastebasketPolicy): void;

  // Personas cache (per context)
  personasByContextId: Record<number, Persona[]>;
  personasFetchedAt: Record<number, number>;
  personasLoadingByContextId: Record<number, boolean>;

  fetchPersonasForContext(contextId: number, opts?: { force?: boolean }): Promise<void>;
  prefetchPersonasForContexts(contextIds: number[]): Promise<void>;
};

const Ctx = createContext<Store | null>(null);

const ACTIVE_CONTEXT_KEY = "veemee-active-context-id";
const nowIso = () => new Date().toISOString();

function loadingSeed(): ContextRow[] {
  return [
    {
      id: -1,
      name: "Loading…",
      skinId: "simple",
      isArchived: false,
      isDeleted: false,
      order: 0,
    },
  ];
}

function seed(): ContextRow[] {
  return [
    { id: 1, name: "Test 1", skinId: "tide", isArchived: false, isDeleted: false, order: 1 },
    { id: 2, name: "Test 2", skinId: "geo", isArchived: false, isDeleted: false, order: 2 },
  ];
}

type ApiContext = {
  id: number;
  handle?: string;
  name?: string;
  display_name?: string;
  skinId?: SkinId;
  skin_id?: SkinId;
  order?: number;
  sort_order?: number;
  is_default?: boolean;
};

function mapApiContext(c: ApiContext): ContextRow {
  return {
    id: c.id,
    name: (c.name ?? c.display_name ?? c.handle ?? `Context ${c.id}`) as string,
    skinId: (c.skinId ?? c.skin_id ?? "simple") as SkinId,
    order: (c.order ?? c.sort_order ?? undefined) as any,
    isArchived: false,
    isDeleted: false,
  };
}

const PERSONA_TTL_MS = 90_000;
const PREFETCH_CONCURRENCY = 3;

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }).map(async () => {
    while (queue.length) {
      const next = queue.shift();
      if (next === undefined) return;
      await worker(next);
    }
  });
  await Promise.all(runners);
}

async function fetchPersonasApi(contextId: number): Promise<Persona[]> {
  const jwt = await SecureStore.getItemAsync("veemee-jwt");
  if (!jwt) return [];

  const res = await fetch(`${API_BASE}/api/contexts/${contextId}/personas`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });

  const text = await res.text();
  const data = JSON.parse(text);
  return data.personas || [];
}

export function ContextStoreProvider({ children }: { children: React.ReactNode }) {
  const [contexts, setContexts] = useState<ContextRow[]>(loadingSeed());

  // start null; we'll hydrate from SecureStore
  const [activeContextId, setActiveContextId] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [wastebasketPolicy, setWastebasketPolicy] = useState<WastebasketPolicy>({
    retentionDays: null,
  });

  // Personas cache
  const [personasByContextId, setPersonasByContextId] = useState<Record<number, Persona[]>>({});
  const [personasFetchedAt, setPersonasFetchedAt] = useState<Record<number, number>>({});
  const [personasLoadingByContextId, setPersonasLoadingByContextId] = useState<Record<number, boolean>>(
    {}
  );

  // ✅ ignore placeholder rows (id <= 0) in "visible" logic
  const getVisible = (all: ContextRow[]) => all.filter((c) => c.id > 0 && !c.isDeleted && !c.isArchived);

  const getFallbackId = (all: ContextRow[]) => {
    const v = getVisible(all).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    return v.length ? v[0].id : null;
  };

  // hydrate activeContextId once
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(ACTIVE_CONTEXT_KEY);

        if (raw) {
          const id = Number(raw);
          setActiveContextId(Number.isNaN(id) ? null : id);
        } else {
          setActiveContextId(null);
        }
      } catch {
        setActiveContextId(null);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // hydrate contexts from backend
  useEffect(() => {
    (async () => {
      try {
        const jwt = await SecureStore.getItemAsync("veemee-jwt");

        // ✅ IMPORTANT: if no JWT, replace Loading… with local seed so we don't get stuck
        if (!jwt) {
          setContexts(seed());
          return;
        }

        const res = await fetch(`${API_BASE}/api/contexts`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        const text = await res.text();
        const data = JSON.parse(text);

        // ✅ if backend returns something unexpected, fall back to seed
        if (!Array.isArray(data.contexts)) {
          setContexts(seed());
          return;
        }

        const mapped: ContextRow[] = data.contexts.map(mapApiContext);
        mapped.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

        setContexts(mapped);

        setActiveContextId((prev) => {
          if (prev != null && mapped.some((c) => c.id === prev)) return prev;
          return null; // keep forcing a choice
        });
      } catch {
        // ✅ also fall back on any error
        setContexts(seed());
      }
    })();
  }, []);

  // validate active context whenever contexts change
  useEffect(() => {
    if (!hydrated) return;
    if (activeContextId == null) return;

    const ok = contexts.some((c) => c.id === activeContextId && c.id > 0 && !c.isDeleted && !c.isArchived);
    if (!ok) setActiveContextId(getFallbackId(contexts));
  }, [contexts, activeContextId, hydrated]);

  // persist on change
  useEffect(() => {
    if (!hydrated) return;

    (async () => {
      try {
        if (activeContextId == null) {
          await SecureStore.deleteItemAsync(ACTIVE_CONTEXT_KEY);
        } else {
          await SecureStore.setItemAsync(ACTIVE_CONTEXT_KEY, String(activeContextId));
        }
      } catch {
        // ignore
      }
    })();
  }, [activeContextId, hydrated]);

  const activeContext = useMemo(
    () => contexts.find((c) => c.id === activeContextId) ?? null,
    [contexts, activeContextId]
  );

  // single implementation (no duplicates)
  const fetchPersonasForContext = async (contextId: number, opts?: { force?: boolean }) => {
    if (!contextId || contextId <= 0) return;

    const force = !!opts?.force;
    const last = personasFetchedAt[contextId] ?? 0;
    const fresh = Date.now() - last < PERSONA_TTL_MS;

    if (!force && fresh) return;
    if (personasLoadingByContextId[contextId]) return;

    setPersonasLoadingByContextId((prev) => ({ ...prev, [contextId]: true }));

    try {
      const personas = await fetchPersonasApi(contextId);
      setPersonasByContextId((prev) => ({ ...prev, [contextId]: personas }));
      setPersonasFetchedAt((prev) => ({ ...prev, [contextId]: Date.now() }));
    } catch (e) {
      console.error("🔥 fetchPersonasForContext failed:", e);
    } finally {
      setPersonasLoadingByContextId((prev) => ({ ...prev, [contextId]: false }));
    }
  };

  const prefetchPersonasForContexts = async (contextIds: number[]) => {
    const ids = Array.from(new Set(contextIds)).filter((x) => typeof x === "number" && x > 0);
    if (!ids.length) return;

    await runWithConcurrency(ids, PREFETCH_CONCURRENCY, async (id) => {
      await fetchPersonasForContext(id);
    });
  };

  const store: Store = useMemo(
    () => ({
      hydrated,

      activeContextId,
      contexts,
      wastebasketPolicy,
      activeContext,

      switchContext(id) {
        const target = contexts.find((c) => c.id === id);
        if (!target || target.id <= 0 || target.isDeleted || target.isArchived) return;
        setActiveContextId(id);
      },

      createContext(input) {
        const id = Math.max(0, ...contexts.map((c) => c.id)) + 1;
        const row: ContextRow = {
          id,
          name: input.name,
          skinId: input.skinId ?? "simple",
          isArchived: false,
          isDeleted: false,
          order: input.order,
        };
        setContexts((prev) => [...prev, row]);
        setActiveContextId(id);
        return id;
      },

      updateContext(id, patch) {
        setContexts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      },

      archiveContext(id) {
        const next = contexts.map((c) => (c.id === id ? { ...c, isArchived: true } : c));
        setContexts(next);
        if (activeContextId === id) setActiveContextId(getFallbackId(next));
      },

      unarchiveContext(id) {
        setContexts((prev) => prev.map((c) => (c.id === id ? { ...c, isArchived: false } : c)));
      },

      deleteContext(id) {
        const target = contexts.find((c) => c.id === id);
        if (!target || target.isDeleted) return;

        const deletedFromState: "active" | "archived" = target.isArchived ? "archived" : "active";
        const next = contexts.map((c) =>
          c.id === id ? { ...c, isDeleted: true, deletedAt: nowIso(), deletedFromState } : c
        );
        setContexts(next);
        if (activeContextId === id) setActiveContextId(getFallbackId(next));
      },

      restoreContext(id) {
        setContexts((prev) =>
          prev.map((c) => {
            if (c.id !== id) return c;
            const restoredArchived = c.deletedFromState === "archived";
            return {
              ...c,
              isDeleted: false,
              deletedAt: undefined,
              deletedFromState: undefined,
              isArchived: restoredArchived,
            };
          })
        );
      },

      purgeContext(id) {
        const next = contexts.filter((c) => c.id !== id);
        setContexts(next);
        if (activeContextId === id) setActiveContextId(getFallbackId(next));
      },

      setWastebasketPolicy(p) {
        setWastebasketPolicy(p);
      },

      // exported cache + fetchers
      personasByContextId,
      personasFetchedAt,
      personasLoadingByContextId,
      fetchPersonasForContext,
      prefetchPersonasForContexts,
    }),
    [
      hydrated,
      activeContextId,
      contexts,
      wastebasketPolicy,
      activeContext,
      personasByContextId,
      personasFetchedAt,
      personasLoadingByContextId,
    ]
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useContextStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useContextStore must be used within ContextStoreProvider");
  return v;
}
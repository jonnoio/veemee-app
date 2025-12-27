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

export type WastebasketPolicy = { retentionDays: number | null };

const API_BASE = "https://veemee.onrender.com";

type Store = {
  // NEW
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
};

const Ctx = createContext<Store | null>(null);

const ACTIVE_CONTEXT_KEY = "veemee-active-context-id";
const nowIso = () => new Date().toISOString();

function seed(): ContextRow[] {
  return [
    { id: 1, name: "World",   skinId: "tide",   isArchived: false, isDeleted: false, order: 1 },
    { id: 2, name: "Weekday", skinId: "geo",    isArchived: false, isDeleted: false, order: 2 },
    { id: 3, name: "Weekend", skinId: "simple", isArchived: false, isDeleted: false, order: 3 },
  ];
}

type ApiContext = {
  id: number;
  handle?: string;
  name?: string;         // if you return it
  display_name?: string; // if you return it
  skinId?: SkinId;       // if you return it
  skin_id?: SkinId;      // if you return it snake_case
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

export function ContextStoreProvider({ children }: { children: React.ReactNode }) {
  const [contexts, setContexts] = useState<ContextRow[]>(seed());

  // NEW: start null; we'll hydrate from SecureStore
  const [activeContextId, setActiveContextId] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [wastebasketPolicy, setWastebasketPolicy] = useState<WastebasketPolicy>({ retentionDays: null });

  const getVisible = (all: ContextRow[]) => all.filter((c) => !c.isDeleted && !c.isArchived);

  const getFallbackId = (all: ContextRow[]) => {
    const v = getVisible(all).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    return v.length ? v[0].id : null;
  };

  // NEW: hydrate activeContextId once
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(ACTIVE_CONTEXT_KEY);

        if (raw) {
          const id = Number(raw);
          setActiveContextId(Number.isNaN(id) ? null : id);
        } else {
          // nothing saved yet -> force user to choose
          setActiveContextId(null);
        }
      } catch {
        // if SecureStore fails, still force a choice rather than silently defaulting
        setActiveContextId(null);
      } finally {
        setHydrated(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NEW: hydrate contexts from backend (pretend JWT works)
  useEffect(() => {
    (async () => {
      try {
        const jwt = await SecureStore.getItemAsync("veemee-jwt");
        if (!jwt) return; // keep seed()

        const res = await fetch(`${API_BASE}/api/contexts`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        const text = await res.text();
        // If you accidentally get HTML (redirect), this will throw and we’ll keep seed()
        const data = JSON.parse(text);

        if (!Array.isArray(data.contexts)) return;

        const mapped: ContextRow[] = data.contexts.map(mapApiContext);

        // sort client-side just in case
        mapped.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

        setContexts(mapped);

        // If we don't have an active context yet, optionally pick default/first.
        // Keep your “force user to choose” behavior if you prefer by removing this block.
        setActiveContextId((prev) => {
          if (prev != null && mapped.some((c) => c.id === prev)) return prev;
          return null; // keep forcing a choice
        });
      } catch {
        // silent fallback to seed()
      }
    })();
  }, []); 

  // NEW: validate active context whenever contexts change (e.g., deleted/archived)
  useEffect(() => {
    if (!hydrated) return;
    if (activeContextId == null) return;

    const ok = contexts.some((c) => c.id === activeContextId && !c.isDeleted && !c.isArchived);
    if (!ok) setActiveContextId(getFallbackId(contexts));
  }, [contexts, activeContextId, hydrated]);

  // NEW: persist on change
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
        // non-fatal; ignore
      }
    })();
  }, [activeContextId, hydrated]);

  const activeContext = useMemo(
    () => contexts.find((c) => c.id === activeContextId) ?? null,
    [contexts, activeContextId]
  );

  const store: Store = useMemo(
    () => ({
      hydrated,

      activeContextId,
      contexts,
      wastebasketPolicy,
      activeContext,

      switchContext(id) {
        const target = contexts.find((c) => c.id === id);
        if (!target || target.isDeleted || target.isArchived) return;
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
        setActiveContextId(id); // makes new context immediately active
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
    }),
    [hydrated, activeContextId, contexts, wastebasketPolicy, activeContext]
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useContextStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useContextStore must be used within ContextStoreProvider");
  return v;
}
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth, getDataKey } from "./auth";
import {
  fetchCloudData,
  patchCloudLead,
  postCloudLead,
  recalculateCloudScores,
  runAiColumnsCloud,
  saveCloudSnapshot,
} from "./data/leads-client";
import { isCloudEnabled } from "./data/is-cloud";
import { SEED_LEADS, BATCH_TEMPLATES } from "./seed-data";
import type { Batch, CreditTransaction, Integrations, Lead, UserData } from "./types";
import { DEFAULT_AI_COLUMNS, type AiColumnKey } from "./types/automation";
import { CREDIT_COSTS, NIGHTLY_BATCH_LEADS } from "./types";
import { fitScore, generateId, todayBatchDate } from "./utils";

export type StorageMode = "local" | "cloud" | "loading";

interface AppContextValue {
  leads: Lead[];
  batches: Batch[];
  toast: string | null;
  storageMode: StorageMode;
  showToast: (msg: string) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  addLead: (lead: Omit<Lead, "id" | "score" | "batch" | "isNew">) => string | null;
  addQuickRow: () => string | null;
  recalculateScores: (ids: string[]) => Promise<string | null>;
  runAiColumns: (ids: string[], columns?: AiColumnKey[]) => Promise<string | null>;
  runNightlyBatch: () => string | null;
  spendCredits: (amount: number, description: string) => boolean;
  addCredits: (amount: number, description: string) => void;
  updateIntegrations: (integrations: Integrations) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function loadUserData(userId: string): UserData {
  try {
    const raw = localStorage.getItem(getDataKey(userId));
    if (raw) return JSON.parse(raw) as UserData;
  } catch {
    /* ignore */
  }
  return {
    leads: SEED_LEADS.map((l) => ({ ...l })),
    batches: [
      {
        id: "batch-1",
        date: "2026-06-13",
        label: "Nightly batch — 13 juni 2026",
        leadCount: 5,
        creditsUsed: 50,
        createdAt: "2026-06-13T02:00:00.000Z",
      },
      {
        id: "batch-2",
        date: "2026-06-12",
        label: "Nightly batch — 12 juni 2026",
        leadCount: 5,
        creditsUsed: 50,
        createdAt: "2026-06-12T02:00:00.000Z",
      },
    ],
  };
}

function saveUserData(userId: string, data: UserData): void {
  localStorage.setItem(getDataKey(userId), JSON.stringify(data));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, updateUser } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<StorageMode>("loading");
  const cloud = isCloudEnabled();

  useEffect(() => {
    if (!user) {
      setLeads([]);
      setBatches([]);
      setStorageMode("loading");
      return;
    }

    let cancelled = false;

    async function load() {
      setStorageMode("loading");
      if (cloud) {
        try {
          const data = await fetchCloudData(user!.id);
          if (!cancelled) {
            setLeads(data.leads);
            setBatches(data.batches);
            setStorageMode("cloud");
          }
          return;
        } catch {
          /* fall through to local */
        }
      }

      const data = loadUserData(user!.id);
      if (!cancelled) {
        setLeads(data.leads);
        setBatches(data.batches);
        setStorageMode("local");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, cloud]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const persistLocal = useCallback(
    (newLeads: Lead[], newBatches: Batch[]) => {
      if (!user) return;
      saveUserData(user.id, { leads: newLeads, batches: newBatches });
    },
    [user]
  );

  const persistAll = useCallback(
    async (newLeads: Lead[], newBatches: Batch[]) => {
      if (!user) return;
      if (storageMode === "cloud") {
        try {
          await saveCloudSnapshot(user.id, newLeads, newBatches);
        } catch {
          showToast("Cloud opslaan mislukt — lokaal terugval");
          persistLocal(newLeads, newBatches);
        }
      } else {
        persistLocal(newLeads, newBatches);
      }
    },
    [user, storageMode, persistLocal, showToast]
  );

  const addTransaction = useCallback(
    (tx: CreditTransaction) => {
      if (!user) return;
      updateUser({
        transactions: [tx, ...user.transactions],
      });
    },
    [user, updateUser]
  );

  const spendCredits = useCallback(
    (amount: number, description: string): boolean => {
      if (!user) return false;
      if (user.credits < amount) return false;
      updateUser({ credits: user.credits - amount });
      addTransaction({
        id: generateId(),
        type: "spend",
        amount: -amount,
        description,
        createdAt: new Date().toISOString(),
      });
      return true;
    },
    [user, updateUser, addTransaction]
  );

  const addCredits = useCallback(
    (amount: number, description: string) => {
      if (!user) return;
      updateUser({ credits: user.credits + amount });
      addTransaction({
        id: generateId(),
        type: "purchase",
        amount,
        description,
        createdAt: new Date().toISOString(),
      });
      showToast(`${amount} credits toegevoegd!`);
    },
    [user, updateUser, addTransaction, showToast]
  );

  const updateLead = useCallback(
    (id: string, updates: Partial<Lead>) => {
      setLeads((prev) => {
        const next = prev.map((l) =>
          l.id === id ? { ...l, ...updates, score: fitScore({ ...l, ...updates }) } : l
        );
        const updated = next.find((l) => l.id === id);
        if (updated && user && storageMode === "cloud") {
          patchCloudLead(user.id, id, updated).catch(() =>
            showToast("Wijziging kon niet worden opgeslagen")
          );
        } else {
          persistLocal(next, batches);
        }
        return next;
      });
    },
    [batches, persistLocal, showToast, storageMode, user]
  );

  const addLead = useCallback(
    (lead: Omit<Lead, "id" | "score" | "batch" | "isNew">): string | null => {
      if (!user) return "Niet ingelogd.";
      if (!spendCredits(CREDIT_COSTS.addLead, "Handmatige lead toegevoegd")) {
        return `Onvoldoende credits. ${CREDIT_COSTS.addLead} credits vereist.`;
      }
      const batch = todayBatchDate();
      const newLead: Lead = {
        ...lead,
        id: generateId(),
        batch,
        isNew: true,
        score: fitScore(lead),
      };

      if (storageMode === "cloud") {
        postCloudLead(user.id, newLead)
          .then((saved) => setLeads((prev) => [saved, ...prev]))
          .catch(() => showToast("Lead kon niet in cloud worden opgeslagen"));
      } else {
        setLeads((prev) => {
          const next = [newLead, ...prev];
          persistLocal(next, batches);
          return next;
        });
      }

      showToast("Lead toegevoegd!");
      return null;
    },
    [user, batches, spendCredits, persistLocal, showToast, storageMode]
  );

  const addQuickRow = useCallback((): string | null => {
    if (!user) return "Niet ingelogd.";
    const batch = todayBatchDate();
    const newLead: Lead = {
      id: generateId(),
      company: "Nieuw bedrijf",
      country: "Nederland",
      employees: 100,
      revenue: "",
      sector: "Agri Dealer",
      contactName: "",
      contactTitle: "",
      linkedinUrl: "",
      status: "nieuw",
      batch,
      isNew: true,
      notes: "",
      message: "",
      score: fitScore({ country: "Nederland", employees: 100, sector: "Agri Dealer" }),
    };

    if (storageMode === "cloud") {
      postCloudLead(user.id, newLead)
        .then((saved) => setLeads((prev) => [saved, ...prev]))
        .catch(() => showToast("Rij kon niet in cloud worden opgeslagen"));
    } else {
      setLeads((prev) => {
        const next = [newLead, ...prev];
        persistLocal(next, batches);
        return next;
      });
    }

    showToast("Nieuwe rij toegevoegd");
    return null;
  }, [user, batches, persistLocal, showToast, storageMode]);

  const recalculateScores = useCallback(
    async (ids: string[]): Promise<string | null> => {
      if (!user) return "Niet ingelogd.";
      if (!ids.length) return "Selecteer minimaal één rij.";

      if (storageMode === "cloud") {
        try {
          const updated = await recalculateCloudScores(user.id, ids);
          setLeads((prev) => {
            const map = new Map(updated.map((l) => [l.id, l]));
            return prev.map((l) => map.get(l.id) ?? l);
          });
          showToast(`Score herberekend voor ${updated.length} leads`);
          return null;
        } catch {
          return "Automatisering mislukt.";
        }
      }

      setLeads((prev) => {
        const idSet = new Set(ids);
        const next = prev.map((l) =>
          idSet.has(l.id) ? { ...l, score: fitScore(l) } : l
        );
        persistLocal(next, batches);
        showToast(`Score herberekend voor ${ids.length} leads`);
        return next;
      });
      return null;
    },
    [user, batches, persistLocal, showToast, storageMode]
  );

  const runAiColumns = useCallback(
    async (ids: string[], columns: AiColumnKey[] = DEFAULT_AI_COLUMNS): Promise<string | null> => {
      if (!user) return "Niet ingelogd.";
      if (!ids.length) return "Selecteer minimaal één rij.";

      const idSet = new Set(ids);
      setLeads((prev) =>
        prev.map((l) => (idSet.has(l.id) ? { ...l, aiStatus: "running" as const } : l))
      );

      try {
        const snapshot = leads.filter((l) => idSet.has(l.id));
        const updated =
          storageMode === "cloud"
            ? await runAiColumnsCloud(user.id, ids, columns)
            : await runAiColumnsCloud(user.id, ids, columns, snapshot);

        setLeads((prev) => {
          const map = new Map(updated.map((l) => [l.id, { ...l, aiStatus: "done" as const }]));
          const next = prev.map((l) => map.get(l.id) ?? l);
          if (storageMode !== "cloud") {
            persistLocal(next, batches);
          }
          return next;
        });

        showToast(`AI kolommen ingevuld voor ${updated.length} leads`);
        return null;
      } catch (e) {
        setLeads((prev) =>
          prev.map((l) =>
            idSet.has(l.id) ? { ...l, aiStatus: "error" as const } : l
          )
        );
        return e instanceof Error ? e.message : "AI kolommen mislukt.";
      }
    },
    [user, leads, batches, persistLocal, showToast, storageMode]
  );

  const runNightlyBatch = useCallback((): string | null => {
    if (!user) return "Niet ingelogd.";
    const cost = CREDIT_COSTS.nightlyBatch * NIGHTLY_BATCH_LEADS;
    if (!spendCredits(cost, `Nightly batch (${NIGHTLY_BATCH_LEADS} leads)`)) {
      return `Onvoldoende credits. ${cost} credits vereist voor een batch.`;
    }

    const batchDate = todayBatchDate();
    const usedCompanies = new Set(leads.map((l) => l.company));
    const available = BATCH_TEMPLATES.filter((t) => !usedCompanies.has(t.company));
    const picked = available.slice(0, NIGHTLY_BATCH_LEADS);

    const newLeads: Lead[] = picked.map((t) => ({
      id: generateId(),
      ...t,
      linkedinUrl: `https://linkedin.com/company/${t.company.toLowerCase().replace(/\s+/g, "-")}`,
      status: "nieuw" as const,
      batch: batchDate,
      isNew: true,
      notes: "",
      message: `Hi ${t.contactName.split(" ")[0]}, ik ben ${user.name.split(" ")[0]} van Legacy Scale Models. We lanceren Universal Hobbies en Weise Toys — op maat gemaakte schaalmodellen voor showrooms, beurzen en klantengeschenken. Graag een korte kennismaking.`,
      score: fitScore(t),
    }));

    const batch: Batch = {
      id: generateId(),
      date: batchDate,
      label: `Nightly batch — ${new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}`,
      leadCount: newLeads.length,
      creditsUsed: cost,
      createdAt: new Date().toISOString(),
    };

    setLeads((prev) => {
      const cleared = prev.map((l) => ({ ...l, isNew: false }));
      const next = [...newLeads, ...cleared];
      const nextBatches = [batch, ...batches];
      setBatches(nextBatches);
      persistAll(next, nextBatches);
      return next;
    });

    showToast(`${newLeads.length} nieuwe leads gegenereerd!`);
    return null;
  }, [user, leads, batches, spendCredits, persistAll, showToast]);

  const updateIntegrations = useCallback(
    (integrations: Integrations) => {
      updateUser({ integrations });
      showToast("Integraties opgeslagen");
    },
    [updateUser, showToast]
  );

  const value = useMemo(
    () => ({
      leads,
      batches,
      toast,
      storageMode,
      showToast,
      updateLead,
      addLead,
      addQuickRow,
      recalculateScores,
      runAiColumns,
      runNightlyBatch,
      spendCredits,
      addCredits,
      updateIntegrations,
    }),
    [
      leads,
      batches,
      toast,
      storageMode,
      showToast,
      updateLead,
      addLead,
      addQuickRow,
      recalculateScores,
      runAiColumns,
      runNightlyBatch,
      spendCredits,
      addCredits,
      updateIntegrations,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

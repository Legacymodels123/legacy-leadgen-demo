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
import { SEED_LEADS, BATCH_TEMPLATES } from "./seed-data";
import type { Batch, CreditTransaction, Integrations, Lead, UserData } from "./types";
import {
  CREDIT_COSTS,
  NIGHTLY_BATCH_LEADS,
} from "./types";
import { fitScore, generateId, todayBatchDate } from "./utils";

interface AppContextValue {
  leads: Lead[];
  batches: Batch[];
  toast: string | null;
  showToast: (msg: string) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  addLead: (lead: Omit<Lead, "id" | "score" | "batch" | "isNew">) => string | null;
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

  useEffect(() => {
    if (!user) {
      setLeads([]);
      setBatches([]);
      return;
    }
    const data = loadUserData(user.id);
    setLeads(data.leads);
    setBatches(data.batches);
  }, [user?.id]);

  const persist = useCallback(
    (newLeads: Lead[], newBatches: Batch[]) => {
      if (!user) return;
      saveUserData(user.id, { leads: newLeads, batches: newBatches });
    },
    [user]
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

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
        persist(next, batches);
        return next;
      });
    },
    [batches, persist]
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
      setLeads((prev) => {
        const next = [newLead, ...prev];
        persist(next, batches);
        return next;
      });
      showToast("Lead toegevoegd!");
      return null;
    },
    [user, batches, spendCredits, persist, showToast]
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
      persist(next, nextBatches);
      return next;
    });

    showToast(`${newLeads.length} nieuwe leads gegenereerd!`);
    return null;
  }, [user, leads, batches, spendCredits, persist, showToast]);

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
      showToast,
      updateLead,
      addLead,
      runNightlyBatch,
      spendCredits,
      addCredits,
      updateIntegrations,
    }),
    [
      leads,
      batches,
      toast,
      showToast,
      updateLead,
      addLead,
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

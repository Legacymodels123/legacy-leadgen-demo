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
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./auth";
import type { Batch, Integrations, Lead } from "./types";
import { CREDIT_COSTS, NIGHTLY_BATCH_LEADS } from "./types";
import { fitScore, todayBatchDate } from "./utils";

interface AppContextValue {
  leads: Lead[];
  batches: Batch[];
  toast: string | null;
  storageMode: "cloud" | "local" | "loading";
  showToast: (msg: string) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  addLead: (lead: Omit<Lead, "id" | "score" | "batch" | "isNew">) => Promise<string | null>;
  addQuickRow: () => Promise<string | null>;
  runNightlyBatch: () => Promise<string | null>;
  spendCredits: (amount: number, description: string) => Promise<boolean>;
  addCredits: (amount: number, description: string) => void;
  updateIntegrations: (integrations: Integrations) => void;
  recalculateScores: (ids: string[]) => Promise<string | null>;
  runAiColumns: (ids: string[]) => Promise<string | null>;
  enrichLeads: (ids: string[]) => Promise<string | null>;
}

const AppContext = createContext<AppContextValue | null>(null);

function rowToLead(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    company: row.company as string,
    country: (row.country as string) ?? "NL",
    employees: (row.employees as number) ?? 0,
    revenue: (row.revenue as string) ?? "",
    sector: (row.sector as string) ?? "",
    contactName: (row.contact_name as string) ?? "",
    contactTitle: (row.contact_title as string) ?? "",
    linkedinUrl: (row.linkedin_url as string) ?? "",
    status: (row.status as Lead["status"]) ?? "nieuw",
    batch: (row.batch as string) ?? "",
    isNew: (row.is_new as boolean) ?? false,
    notes: (row.notes as string) ?? "",
    message: (row.message as string) ?? "",
    score: (row.score as number) ?? 0,
  };
}

function rowToBatch(row: Record<string, unknown>): Batch {
  return {
    id: row.id as string,
    date: (row.date as string) ?? "",
    label: (row.label as string) ?? "",
    leadCount: (row.lead_count as number) ?? 0,
    creditsUsed: (row.credits_used as number) ?? 0,
    createdAt: (row.created_at as string) ?? "",
  };
}

function leadToRow(lead: Partial<Lead> & { user_id?: string }) {
  const row: Record<string, unknown> = {};
  if (lead.user_id !== undefined) row.user_id = lead.user_id;
  if (lead.company !== undefined) row.company = lead.company;
  if (lead.country !== undefined) row.country = lead.country;
  if (lead.employees !== undefined) row.employees = lead.employees;
  if (lead.revenue !== undefined) row.revenue = lead.revenue;
  if (lead.sector !== undefined) row.sector = lead.sector;
  if (lead.contactName !== undefined) row.contact_name = lead.contactName;
  if (lead.contactTitle !== undefined) row.contact_title = lead.contactTitle;
  if (lead.linkedinUrl !== undefined) row.linkedin_url = lead.linkedinUrl;
  if (lead.status !== undefined) row.status = lead.status;
  if (lead.batch !== undefined) row.batch = lead.batch;
  if (lead.isNew !== undefined) row.is_new = lead.isNew;
  if (lead.notes !== undefined) row.notes = lead.notes;
  if (lead.message !== undefined) row.message = lead.message;
  if (lead.score !== undefined) row.score = lead.score;
  return row;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, updateUser } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!user) { setLeads([]); setBatches([]); return; }
    supabase.from("leads").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setLeads(data.map(rowToLead)); });
    supabase.from("batches").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setBatches(data.map(rowToBatch)); });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const spendCredits = useCallback(async (amount: number, _description: string): Promise<boolean> => {
    if (!user || user.credits < amount) return false;
    updateUser({ credits: user.credits - amount });
    return true;
  }, [user, updateUser]);

  const addCredits = useCallback((amount: number, _description: string) => {
    if (!user) return;
    updateUser({ credits: user.credits + amount });
    showToast(`${amount} credits toegevoegd!`);
  }, [user, updateUser, showToast]);

  const updateLead = useCallback((id: string, updates: Partial<Lead>) => {
    setLeads((prev) => {
      const next = prev.map((l) =>
        l.id === id ? { ...l, ...updates, score: fitScore({ ...l, ...updates }) } : l
      );
      supabase.from("leads").update(leadToRow({ ...updates, score: fitScore(updates) })).eq("id", id);
      return next;
    });
  }, [supabase]);

  const addLead = useCallback(async (
    lead: Omit<Lead, "id" | "score" | "batch" | "isNew">
  ): Promise<string | null> => {
    if (!user) return "Niet ingelogd.";
    const ok = await spendCredits(CREDIT_COSTS.addLead, "Lead toegevoegd");
    if (!ok) return `Onvoldoende credits. ${CREDIT_COSTS.addLead} vereist.`;
    const batch = todayBatchDate();
    const score = fitScore(lead);
    const { data, error } = await supabase.from("leads")
      .insert({ ...leadToRow({ ...lead, batch, isNew: true, score }), user_id: user.id })
      .select().single();
    if (error) return error.message;
    if (data) setLeads((prev) => [rowToLead(data), ...prev]);
    showToast("Lead toegevoegd!");
    return null;
  }, [user, spendCredits, supabase, showToast]);

  const runNightlyBatch = useCallback(async (): Promise<string | null> => {
    if (!user) return "Niet ingelogd.";
    const cost = CREDIT_COSTS.nightlyBatch * NIGHTLY_BATCH_LEADS;
    const ok = await spendCredits(cost, "Nightly batch");
    if (!ok) return `Onvoldoende credits. ${cost} vereist.`;
    const batchDate = todayBatchDate();
    await supabase.from("leads").update({ is_new: false }).eq("user_id", user.id);
    setLeads((prev) => prev.map((l) => ({ ...l, isNew: false })));
    const { data: batchData } = await supabase.from("batches").insert({
      user_id: user.id,
      date: batchDate,
      label: `Nightly batch — ${new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}`,
      lead_count: NIGHTLY_BATCH_LEADS,
      credits_used: cost,
      source: "manual",
    }).select().single();
    if (batchData) setBatches((prev) => [rowToBatch(batchData), ...prev]);
    showToast("Batch aangemaakt. Importeer leads via LinkedIn CSV.");
    return null;
  }, [user, spendCredits, supabase, showToast]);

  const updateIntegrations = useCallback((integrations: Integrations) => {
    updateUser({ integrations });
    showToast("Integraties opgeslagen");
  }, [updateUser, showToast]);

  const addQuickRow = useCallback(async (): Promise<string | null> => {
    return addLead({
      company: "Nieuw bedrijf",
      country: "NL",
      employees: 0,
      revenue: "",
      sector: "",
      contactName: "",
      contactTitle: "",
      linkedinUrl: "",
      status: "nieuw",
      notes: "",
      message: "",
    });
  }, [addLead]);

  const recalculateScores = useCallback(async (ids: string[]): Promise<string | null> => {
    const toUpdate = leads.filter((l) => ids.includes(l.id));
    for (const lead of toUpdate) {
      const score = fitScore(lead);
      updateLead(lead.id, { score });
    }
    showToast(`${ids.length} score(s) herbe
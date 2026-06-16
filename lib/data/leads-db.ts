import type { Batch, Lead } from "@/lib/types";

export interface LeadRow {
  id: string;
  user_id: string;
  company: string;
  country: string;
  employees: number;
  revenue: string;
  sector: string;
  contact_name: string;
  contact_title: string;
  linkedin_url: string;
  status: string;
  batch: string;
  is_new: boolean;
  notes: string;
  message: string;
  score: number | null;
  ai_message: string | null;
  ai_summary: string | null;
  ai_next_step: string | null;
}

export interface BatchRow {
  id: string;
  user_id: string;
  date: string;
  label: string;
  lead_count: number;
  credits_used: number;
  created_at: string;
}

export function leadToRow(lead: Lead, userId: string): LeadRow {
  return {
    id: lead.id,
    user_id: userId,
    company: lead.company,
    country: lead.country,
    employees: lead.employees,
    revenue: lead.revenue,
    sector: lead.sector,
    contact_name: lead.contactName,
    contact_title: lead.contactTitle,
    linkedin_url: lead.linkedinUrl,
    status: lead.status,
    batch: lead.batch,
    is_new: lead.isNew,
    notes: lead.notes,
    message: lead.message,
    score: lead.score ?? null,
    ai_message: lead.aiMessage ?? null,
    ai_summary: lead.aiSummary ?? null,
    ai_next_step: lead.aiNextStep ?? null,
  };
}

export function rowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    company: row.company,
    country: row.country,
    employees: row.employees,
    revenue: row.revenue,
    sector: row.sector,
    contactName: row.contact_name,
    contactTitle: row.contact_title,
    linkedinUrl: row.linkedin_url,
    status: row.status as Lead["status"],
    batch: row.batch,
    isNew: row.is_new,
    notes: row.notes,
    message: row.message,
    score: row.score ?? undefined,
    aiMessage: row.ai_message ?? undefined,
    aiSummary: row.ai_summary ?? undefined,
    aiNextStep: row.ai_next_step ?? undefined,
  };
}

export function batchToRow(batch: Batch, userId: string): BatchRow {
  return {
    id: batch.id,
    user_id: userId,
    date: batch.date,
    label: batch.label,
    lead_count: batch.leadCount,
    credits_used: batch.creditsUsed,
    created_at: batch.createdAt,
  };
}

export function rowToBatch(row: BatchRow): Batch {
  return {
    id: row.id,
    date: row.date,
    label: row.label,
    leadCount: row.lead_count,
    creditsUsed: row.credits_used,
    createdAt: row.created_at,
  };
}

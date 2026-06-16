export type LeadStatus =
  | "nieuw"
  | "bekeken"
  | "verstuurd"
  | "opvolgen"
  | "gewonnen"
  | "verloren";

export type AiStatus = "idle" | "running" | "done" | "error";

export interface Lead {
  id: string;
  company: string;
  country: string;
  employees: number;
  revenue: string;
  sector: string;
  contactName: string;
  contactTitle: string;
  linkedinUrl: string;
  status: LeadStatus;
  batch: string;
  isNew: boolean;
  notes: string;
  message: string;
  score?: number;
  aiMessage?: string;
  aiSummary?: string;
  aiNextStep?: string;
  aiStatus?: AiStatus;
}

export interface Batch {
  id: string;
  date: string;
  label: string;
  leadCount: number;
  creditsUsed: number;
  createdAt: string;
}

export interface CreditTransaction {
  id: string;
  type: "purchase" | "spend" | "bonus";
  amount: number;
  description: string;
  createdAt: string;
}

export interface Integrations {
  linkedin: boolean;
  crm: boolean;
  webhooks: boolean;
  nightlyAgent: boolean;
}

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  company: string;
  credits: number;
  transactions: CreditTransaction[];
  integrations: Integrations;
}

export interface UserData {
  leads: Lead[];
  batches: Batch[];
}

export const CREDIT_COSTS = {
  addLead: 5,
  nightlyBatch: 10,
  copyMessage: 0,
} as const;

export const STARTING_CREDITS = 100;
export const NIGHTLY_BATCH_LEADS = 3;

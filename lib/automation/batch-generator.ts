import { callClaude, parseJsonArray } from "./claude-client";
import { EXPANDED_BATCH_POOL } from "@/lib/seed-data";
import type { Lead } from "@/lib/types";
import { fitScore, generateId, todayBatchDate } from "@/lib/utils";

export interface LeadDraft {
  company: string;
  country: string;
  employees: number;
  revenue: string;
  sector: string;
  contactName: string;
  contactTitle: string;
  outreachAngle?: string;
}

export type BatchSource = "ai" | "templates";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateFromTemplates(
  existingCompanies: Set<string>,
  count: number,
  userName: string
): { drafts: LeadDraft[]; source: BatchSource } {
  const available = shuffle(
    EXPANDED_BATCH_POOL.filter((t) => !existingCompanies.has(t.company))
  );

  const picked =
    available.length >= count
      ? available.slice(0, count)
      : [
          ...available,
          ...shuffle(EXPANDED_BATCH_POOL)
            .filter((t) => !existingCompanies.has(t.company))
            .slice(0, count - available.length),
        ].slice(0, count);

  const drafts: LeadDraft[] = picked.map((t) => ({
    ...t,
    outreachAngle: `Potentiële partner voor schaalmodellen — ${t.sector} in ${t.country}`,
  }));

  if (drafts.length < count) {
    for (let i = drafts.length; i < count; i++) {
      const n = i + 1;
      drafts.push({
        company: `Agri Prospect ${n} BV`,
        country: "Nederland",
        employees: 80 + n * 15,
        revenue: "€10M",
        sector: "Agri Dealer",
        contactName: `Contact ${n}`,
        contactTitle: "Commercial Manager",
        outreachAngle: "Nieuwe prospect gegenereerd via smart batch",
      });
    }
  }

  void userName;
  return { drafts, source: "templates" };
}

export async function generateBatchLeads(
  apiKey: string | undefined,
  existingCompanies: string[],
  count: number,
  userName: string
): Promise<{ drafts: LeadDraft[]; source: BatchSource }> {
  const used = new Set(existingCompanies);

  if (apiKey) {
    try {
      const system =
        "Je bent een B2B lead researcher voor Legacy Scale Models (premium schaalmodellen voor agri/mobility sector). Geef alleen geldige JSON terug, geen markdown.";

      const user = `Genereer precies ${count} unieke, realistische B2B leads voor outreach.
Focus: agri machinery, dealers, importers, manufacturers in Nederland, Duitsland, België, Noorwegen.
Sluit deze bedrijven uit: ${existingCompanies.slice(0, 40).join(", ") || "geen"}

Return ONLY a JSON array. Elk object:
{
  "company": string,
  "country": string,
  "employees": number,
  "revenue": string,
  "sector": string,
  "contactName": string,
  "contactTitle": string,
  "outreachAngle": string
}

Gebruik realistische bedrijfsnamen en contactpersonen. Geen duplicaten.`;

      const text = await callClaude(apiKey, system, user, 2048);
      const parsed = parseJsonArray<LeadDraft>(text)
        .filter((d) => d.company && !used.has(d.company))
        .slice(0, count);

      if (parsed.length >= count) {
        return { drafts: parsed, source: "ai" };
      }
    } catch {
      /* fallback to templates */
    }
  }

  return generateFromTemplates(used, count, userName);
}

export function draftsToLeads(
  drafts: LeadDraft[],
  batchDate: string,
  userName: string,
  source: BatchSource
): Lead[] {
  const firstName = userName.split(" ")[0] || "Levi";
  const sourceNote = source === "ai" ? "AI web research batch" : "Smart template batch";

  return drafts.map((d) => {
    const base = {
      company: d.company,
      country: d.country,
      employees: d.employees,
      revenue: d.revenue,
      sector: d.sector,
      contactName: d.contactName,
      contactTitle: d.contactTitle,
    };
    const contactFirst = d.contactName.split(" ")[0] || "daar";
    return {
      id: generateId(),
      ...base,
      linkedinUrl: `https://linkedin.com/search/results/companies/?keywords=${encodeURIComponent(d.company)}`,
      status: "nieuw" as const,
      batch: batchDate,
      isNew: true,
      notes: `[${sourceNote}] ${d.outreachAngle ?? ""}`.trim(),
      message: `Hi ${contactFirst}, ik ben ${firstName} van Legacy Scale Models. We lanceren Universal Hobbies en Weise Toys — op maat gemaakte schaalmodellen voor showrooms, beurzen en klantengeschenken. ${d.outreachAngle ? d.outreachAngle + " " : ""}Graag een korte kennismaking.`,
      score: fitScore(base),
    };
  });
}

export function batchLabel(source: BatchSource, date: Date): string {
  const formatted = date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return source === "ai"
    ? `AI research batch — ${formatted}`
    : `Smart batch — ${formatted}`;
}

export { todayBatchDate };

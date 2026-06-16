import { NextRequest, NextResponse } from "next/server";
import { enrichLeadFallback, enrichLeadWithAi } from "@/lib/automation/enrich-lead";
import { rowToLead, type LeadRow } from "@/lib/data/leads-db";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types";
import { fitScore } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const body = (await req.json()) as { leadIds: string[]; leads?: Lead[] };
  const { leadIds } = body;
  if (!leadIds?.length) {
    return NextResponse.json({ error: "Geen leads geselecteerd" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const supabase = createAdminClient();
  let targets: Lead[] = [];

  if (supabase) {
    const { data: rows, error } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", userId)
      .in("id", leadIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    targets = ((rows as LeadRow[]) ?? []).map(rowToLead);
  }

  if (!targets.length && body.leads?.length) {
    const idSet = new Set(leadIds);
    targets = body.leads.filter((l) => idSet.has(l.id));
  }

  if (!targets.length) {
    return NextResponse.json({ error: "Geen leads gevonden" }, { status: 404 });
  }

  const updated: Lead[] = [];

  for (const lead of targets) {
    try {
      const enrichment = apiKey
        ? await enrichLeadWithAi(apiKey, lead)
        : enrichLeadFallback(lead);

      const merged: Lead = {
        ...lead,
        sector: enrichment.sector,
        employees: enrichment.employees,
        revenue: enrichment.revenue,
        contactName: enrichment.contactName || lead.contactName,
        contactTitle: enrichment.contactTitle || lead.contactTitle,
        country: enrichment.country || lead.country,
        aiSummary: enrichment.aiSummary,
        notes: `[AI verrijkt] ${enrichment.outreachAngle}${lead.notes ? " · " + lead.notes : ""}`,
        score: fitScore({
          employees: enrichment.employees,
          sector: enrichment.sector,
          country: enrichment.country,
        }),
      };

      if (supabase) {
        const { data, error } = await supabase
          .from("leads")
          .update({
            sector: merged.sector,
            employees: merged.employees,
            revenue: merged.revenue,
            contact_name: merged.contactName,
            contact_title: merged.contactTitle,
            country: merged.country,
            ai_summary: merged.aiSummary ?? "",
            notes: merged.notes,
            score: merged.score ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", lead.id)
          .eq("user_id", userId)
          .select()
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        updated.push(rowToLead(data as LeadRow));
      } else {
        updated.push(merged);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Verrijking mislukt";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  return NextResponse.json({ leads: updated, aiPowered: Boolean(apiKey) });
}

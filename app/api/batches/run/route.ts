import { NextRequest, NextResponse } from "next/server";
import {
  batchLabel,
  draftsToLeads,
  generateBatchLeads,
  todayBatchDate,
} from "@/lib/automation/batch-generator";
import { batchToRow, leadToRow, rowToBatch, rowToLead, type BatchRow, type LeadRow } from "@/lib/data/leads-db";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Batch } from "@/lib/types";
import { NIGHTLY_BATCH_LEADS } from "@/lib/types";
import { generateId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const body = (await req.json()) as {
    existingCompanies?: string[];
    count?: number;
    userName?: string;
  };

  const count = body.count ?? NIGHTLY_BATCH_LEADS;
  const existing = body.existingCompanies ?? [];
  const userName = body.userName ?? "Levi";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { drafts, source } = await generateBatchLeads(apiKey, existing, count, userName);

  const batchDate = todayBatchDate();
  const newLeads = draftsToLeads(drafts, batchDate, userName, source);

  const batch: Batch = {
    id: generateId(),
    date: batchDate,
    label: batchLabel(source, new Date()),
    leadCount: newLeads.length,
    creditsUsed: 0,
    createdAt: new Date().toISOString(),
  };

  const supabase = createAdminClient();
  if (supabase) {
    await supabase.from("leads").update({ is_new: false }).eq("user_id", userId);
    const { error: leadErr } = await supabase
      .from("leads")
      .insert(newLeads.map((l) => leadToRow(l, userId)));
    if (leadErr) {
      return NextResponse.json({ error: leadErr.message }, { status: 500 });
    }
    const { data: batchRow, error: batchErr } = await supabase
      .from("batches")
      .insert(batchToRow(batch, userId))
      .select()
      .single();
    if (batchErr) {
      return NextResponse.json({ error: batchErr.message }, { status: 500 });
    }

    const { data: allLeads } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      leads: newLeads,
      batch: rowToBatch(batchRow as BatchRow),
      allLeads: ((allLeads as LeadRow[]) ?? []).map(rowToLead),
      source,
    });
  }

  return NextResponse.json({ leads: newLeads, batch, source });
}

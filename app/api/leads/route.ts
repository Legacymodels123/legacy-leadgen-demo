import { NextRequest, NextResponse } from "next/server";
import {
  batchToRow,
  leadToRow,
  rowToBatch,
  rowToLead,
  type BatchRow,
  type LeadRow,
} from "@/lib/data/leads-db";
import { createAdminClient } from "@/lib/supabase/admin";
import { SEED_LEADS } from "@/lib/seed-data";
import type { Batch, Lead } from "@/lib/types";
import { fitScore, generateId } from "@/lib/utils";

function getUserId(req: NextRequest): string | null {
  return req.headers.get("x-user-id");
}

function defaultBatches(userId: string): BatchRow[] {
  return [
    {
      id: "batch-1",
      user_id: userId,
      date: "2026-06-13",
      label: "Nightly batch — 13 juni 2026",
      lead_count: 5,
      credits_used: 50,
      created_at: "2026-06-13T02:00:00.000Z",
    },
    {
      id: "batch-2",
      user_id: userId,
      date: "2026-06-12",
      label: "Nightly batch — 12 juni 2026",
      lead_count: 5,
      credits_used: 50,
      created_at: "2026-06-12T02:00:00.000Z",
    },
  ];
}

async function seedIfEmpty(userId: string) {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { count } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (count && count > 0) return supabase;

  const leadRows = SEED_LEADS.map((l) => leadToRow({ ...l, id: generateId() }, userId));
  await supabase.from("leads").insert(leadRows);
  await supabase.from("batches").insert(defaultBatches(userId));
  return supabase;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  const supabase = await seedIfEmpty(userId);
  if (!supabase) {
    return NextResponse.json({ error: "Cloud storage not configured" }, { status: 503 });
  }

  const [{ data: leadRows }, { data: batchRows }] = await Promise.all([
    supabase.from("leads").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("batches").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    leads: (leadRows as LeadRow[] | null)?.map(rowToLead) ?? [],
    batches: (batchRows as BatchRow[] | null)?.map(rowToBatch) ?? [],
  });
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud storage not configured" }, { status: 503 });
  }

  const lead = (await req.json()) as Lead;
  const row = leadToRow({ ...lead, score: lead.score ?? fitScore(lead) }, userId);
  const { data, error } = await supabase.from("leads").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(rowToLead(data as LeadRow));
}

export async function PUT(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud storage not configured" }, { status: 503 });
  }

  const body = (await req.json()) as { leads: Lead[]; batches: Batch[] };
  await supabase.from("leads").delete().eq("user_id", userId);
  await supabase.from("batches").delete().eq("user_id", userId);

  if (body.leads.length) {
    await supabase.from("leads").insert(body.leads.map((l) => leadToRow(l, userId)));
  }
  if (body.batches.length) {
    await supabase.from("batches").insert(body.batches.map((b) => batchToRow(b, userId)));
  }

  return NextResponse.json({ ok: true });
}

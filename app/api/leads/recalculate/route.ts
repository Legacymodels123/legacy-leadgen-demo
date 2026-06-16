import { NextRequest, NextResponse } from "next/server";
import { leadToRow, rowToLead, type LeadRow } from "@/lib/data/leads-db";
import { createAdminClient } from "@/lib/supabase/admin";
import { fitScore } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud storage not configured" }, { status: 503 });
  }

  const { ids } = (await req.json()) as { ids: string[] };
  if (!ids?.length) {
    return NextResponse.json({ error: "No leads selected" }, { status: 400 });
  }

  const { data: rows, error } = await supabase
    .from("leads")
    .select("*")
    .eq("user_id", userId)
    .in("id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const updated: LeadRow[] = [];
  for (const row of (rows as LeadRow[]) ?? []) {
    const lead = rowToLead(row);
    const score = fitScore(lead);
    const next = leadToRow({ ...lead, score }, userId);
    const { data } = await supabase
      .from("leads")
      .update({ score, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("user_id", userId)
      .select()
      .single();
    if (data) updated.push(data as LeadRow);
  }

  return NextResponse.json(updated.map(rowToLead));
}

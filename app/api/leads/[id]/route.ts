import { NextRequest, NextResponse } from "next/server";
import { leadToRow, rowToLead, type LeadRow } from "@/lib/data/leads-db";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types";
import { fitScore } from "@/lib/utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud storage not configured" }, { status: 503 });
  }

  const { id } = await params;
  const updates = (await req.json()) as Partial<Lead>;

  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const merged = { ...rowToLead(existing as LeadRow), ...updates };
  merged.score = fitScore(merged);

  const row = leadToRow(merged, userId);
  const { data, error } = await supabase
    .from("leads")
    .update({ ...row, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(rowToLead(data as LeadRow));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud storage not configured" }, { status: 503 });
  }

  const { id } = await params;
  await supabase.from("leads").delete().eq("id", id).eq("user_id", userId);
  return NextResponse.json({ ok: true });
}

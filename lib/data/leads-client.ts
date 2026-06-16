import type { Batch, Lead } from "@/lib/types";
import type { AiColumnKey } from "@/lib/types/automation";

function headers(userId: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-user-id": userId,
  };
}

export async function fetchCloudData(userId: string): Promise<{ leads: Lead[]; batches: Batch[] }> {
  const res = await fetch("/api/leads", { headers: headers(userId) });
  if (!res.ok) throw new Error("Kon cloud data niet laden");
  return res.json();
}

export async function patchCloudLead(
  userId: string,
  id: string,
  updates: Partial<Lead>
): Promise<Lead> {
  const res = await fetch(`/api/leads/${id}`, {
    method: "PATCH",
    headers: headers(userId),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Kon lead niet opslaan");
  return res.json();
}

export async function postCloudLead(userId: string, lead: Lead): Promise<Lead> {
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: headers(userId),
    body: JSON.stringify(lead),
  });
  if (!res.ok) throw new Error("Kon lead niet toevoegen");
  return res.json();
}

export async function recalculateCloudScores(
  userId: string,
  ids: string[]
): Promise<Lead[]> {
  const res = await fetch("/api/leads/recalculate", {
    method: "POST",
    headers: headers(userId),
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Automatisering mislukt");
  return res.json();
}

export async function runAiColumnsCloud(
  userId: string,
  leadIds: string[],
  columns?: AiColumnKey[],
  leads?: Lead[]
): Promise<Lead[]> {
  const res = await fetch("/api/automations/run", {
    method: "POST",
    headers: headers(userId),
    body: JSON.stringify({ leadIds, columns, leads }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "AI kolommen mislukt");
  }
  return res.json();
}

export async function saveCloudSnapshot(
  userId: string,
  leads: Lead[],
  batches: Batch[]
): Promise<void> {
  const res = await fetch("/api/leads", {
    method: "PUT",
    headers: headers(userId),
    body: JSON.stringify({ leads, batches }),
  });
  if (!res.ok) throw new Error("Kon snapshot niet opslaan");
}

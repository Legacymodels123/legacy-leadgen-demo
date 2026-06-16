import { buildPrompt } from "./prompts";
import { callClaude } from "./claude-client";
import type { AiColumnKey } from "@/lib/types/automation";
import type { Lead } from "@/lib/types";

export async function generateAiColumn(
  apiKey: string,
  column: AiColumnKey,
  lead: Lead
): Promise<string> {
  const { system, user } = buildPrompt(column, lead);
  return callClaude(apiKey, system, user, 512);
}

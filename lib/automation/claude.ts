import { buildPrompt } from "./prompts";
import type { AiColumnKey } from "@/lib/types/automation";
import type { Lead } from "@/lib/types";

const MODEL = "claude-sonnet-4-20250514";

export async function generateAiColumn(
  apiKey: string,
  column: AiColumnKey,
  lead: Lead
): Promise<string> {
  const { system, user } = buildPrompt(column, lead);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = data.content?.find((b) => b.type === "text")?.text?.trim();
  if (!text) throw new Error("Leeg antwoord van Claude");
  return text;
}

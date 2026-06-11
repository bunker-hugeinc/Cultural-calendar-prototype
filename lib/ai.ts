import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "placeholder",
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

export async function callClaude({
  system,
  user,
  model = "claude-haiku-4-5-20251001",
  maxTokens = 4096,
  temperature = 0.3,
}: {
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const { text } = await generateText({
    model: anthropic(model),
    system,
    prompt: user,
    maxOutputTokens: maxTokens,
    temperature,
  });
  return text;
}

export function parseJSON<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

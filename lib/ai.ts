import Groq from "groq-sdk";

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Strips markdown code fences that open-source models sometimes wrap around JSON,
 * then parses and returns typed output.
 */
export function parseJSON<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

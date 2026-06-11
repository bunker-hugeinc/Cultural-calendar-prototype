/**
 * Robustly extracts a JSON object or array from a Claude response string.
 * Handles: markdown fencing, leading/trailing prose, partial responses.
 */
export function extractJSON(text: string): any {
  if (!text?.trim()) throw new Error("Empty response from AI");

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  let cleaned = text
    .replace(/^```json\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/```\s*$/im, "")
    .trim();

  // Try direct parse first (fastest path)
  try {
    return JSON.parse(cleaned);
  } catch {}

  // Find the first { or [ and extract to its matching closing bracket
  const objIdx = cleaned.indexOf("{");
  const arrIdx = cleaned.indexOf("[");
  let start = -1;

  if (objIdx === -1 && arrIdx === -1) {
    throw new Error(`No JSON found in AI response. Raw: ${text.slice(0, 200)}`);
  }
  if (objIdx === -1) start = arrIdx;
  else if (arrIdx === -1) start = objIdx;
  else start = Math.min(objIdx, arrIdx);

  let depth = 0;
  let end = -1;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === "{" || cleaned[i] === "[") depth++;
    if (cleaned[i] === "}" || cleaned[i] === "]") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) throw new Error(`Malformed JSON in AI response. Raw: ${text.slice(0, 200)}`);

  return JSON.parse(cleaned.slice(start, end + 1));
}

/**
 * Same as extractJSON but returns a fallback value instead of throwing.
 * Use this when a partial failure should degrade gracefully rather than error.
 */
export function extractJSONSafe<T>(text: string, fallback: T): T {
  try {
    return extractJSON(text) as T;
  } catch {
    return fallback;
  }
}

// Shared moment/candidate de-duplication helpers.
// Used by feed discovery (server) and the feed list (client) so both agree on
// what counts as "the same" cultural moment.

const FILLER = new Set([
  "the", "a", "an", "of", "and", "&", "for", "to", "in", "on", "at",
  "annual", "festival", "fest", "event", "day", "days", "week", "weekend",
  "celebration", "season", "official", "us", "usa", "national", "world", "global",
  "championship", "championships", "tournament", "open", "cup", "series", "game", "games",
]);

/** Lowercase, strip punctuation, drop years, and remove filler words. */
export function normalizeMomentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/20\d{2}/g, " ")          // drop years like 2026
    .replace(/[^a-z0-9\s]/g, " ")      // strip punctuation
    .split(/\s+/)
    .filter(w => w && !FILLER.has(w))
    .join(" ")
    .trim();
}

function tokenSet(name: string): Set<string> {
  return new Set(normalizeMomentName(name).split(/\s+/).filter(Boolean));
}

/** Jaccard similarity of significant tokens (0–1). */
export function nameSimilarity(a: string, b: string): number {
  const sa = tokenSet(a);
  const sb = tokenSet(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * True if `name` is effectively a duplicate of any name in `existing`.
 * Catches exact normalized matches plus close variants (e.g. "College Football
 * Playoff" vs "College Football Playoff National Championship").
 */
export function isLikelyDuplicate(name: string, existing: Iterable<string>, threshold = 0.6): boolean {
  const norm = normalizeMomentName(name);
  if (!norm) return false;
  for (const e of existing) {
    const en = normalizeMomentName(e);
    if (!en) continue;
    if (en === norm) return true;
    if (en.includes(norm) || norm.includes(en)) return true;
    if (nameSimilarity(name, e) >= threshold) return true;
  }
  return false;
}

/** Collapse a list to one item per distinct moment, keeping the "best" by a scorer. */
export function dedupeBy<T>(items: T[], nameOf: (t: T) => string, better: (a: T, b: T) => T): T[] {
  const kept: T[] = [];
  for (const item of items) {
    const idx = kept.findIndex(k => {
      const kn = normalizeMomentName(nameOf(k));
      const inN = normalizeMomentName(nameOf(item));
      return kn === inN || kn.includes(inN) || inN.includes(kn) || nameSimilarity(nameOf(k), nameOf(item)) >= 0.6;
    });
    if (idx === -1) kept.push(item);
    else kept[idx] = better(kept[idx], item);
  }
  return kept;
}

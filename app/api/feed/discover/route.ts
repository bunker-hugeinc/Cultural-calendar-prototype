import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { merchants, moments, feedCandidates } from "@/lib/db/schema";
import { callClaude, parseJSON } from "@/lib/ai";
import { DISCOVER_SYSTEM_PROMPT } from "@/lib/prompts";
import { createId } from "@paralleldrive/cuid2";
import { sql, ne } from "drizzle-orm";

export const maxDuration = 60;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("[discover] ANTHROPIC_API_KEY is not set");
}

interface DiscoverCandidate {
  name: string;
  startDate: string;
  endDate: string | null;
  category: "gather" | "improve" | "excite";
  score: number;
  headline: string;
  body: string;
  why: string;
  hook: string;
  partners: string[];
  personas: { t: string; h: string; d: string }[];
  hashtags: string[];
  competing: string[];
}

interface FeedSettings {
  timeWindow: "3m" | "6m" | "12m" | "custom";
  customStart?: string;
  customEnd?: string;
  categories: ("gather" | "improve" | "excite")[];
  priorityMerchants: string[];
  minScore: number;
}

function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, date.getDate());
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildStructuredQuery(settings: FeedSettings): string {
  const now = new Date();
  let startDate: string;
  let endDate: string;

  if (settings.timeWindow === "custom" && settings.customStart && settings.customEnd) {
    startDate = settings.customStart;
    endDate   = settings.customEnd;
  } else {
    const months = settings.timeWindow === "3m" ? 3 : settings.timeWindow === "6m" ? 6 : 12;
    startDate = toYMD(now);
    endDate   = toYMD(addMonths(now, months));
  }

  const catList  = settings.categories.join(", ");
  const mercList = settings.priorityMerchants.length > 0
    ? settings.priorityMerchants.join(", ")
    : "any from catalog";

  return `Generate 5 cultural moment candidates for Apple Pay Partner Marketing.

Requirements:
- Time window: ${startDate} to ${endDate}
- Categories wanted: ${catList}
- Priority merchant partners: ${mercList}
- Minimum fit score: ${settings.minScore.toFixed(1)}/10.0`;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "API key not configured. Add ANTHROPIC_API_KEY to .env.local." },
      { status: 503 }
    );
  }

  const body = await req.json();
  const isStructured = !!body.settings;
  const settings = body.settings as FeedSettings | undefined;

  const today = new Date();
  const todayStr = toYMD(today);
  const systemPrompt = DISCOVER_SYSTEM_PROMPT.replace("{TODAY}", todayStr);

  // Compute time window
  let windowStart: string;
  let windowEnd: string;
  if (isStructured && settings?.timeWindow === "custom" && settings.customStart && settings.customEnd) {
    windowStart = settings.customStart;
    windowEnd   = settings.customEnd;
  } else {
    const months = isStructured
      ? (settings?.timeWindow === "3m" ? 3 : settings?.timeWindow === "6m" ? 6 : 12)
      : 12;
    windowStart = todayStr;
    windowEnd   = toYMD(addMonths(today, months));
  }

  if (!isStructured) {
    const query: string = (body.query ?? "").trim();
    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }
  }

  const [allMerchants, allMoments] = await Promise.all([
    db.select({ name: merchants.name, category: merchants.category }).from(merchants),
    db.select({ name: moments.name, startDate: moments.startDate }).from(moments),
  ]);

  const existingMomentsList = allMoments
    .map(m => `- ${m.name} (${m.startDate})`)
    .join("\n");

  const userMessage = `Generate cultural moment recommendations for Apple Pay Partner Marketing.

Time window: ${windowStart} to ${windowEnd}
Categories wanted: ${settings?.categories?.join(", ") ?? "gather, improve, excite"}
Priority merchant partners: ${settings?.priorityMerchants?.join(", ") || "any from catalog"}
Minimum fit score: ${settings?.minScore ?? 3.5}/10.0

Available merchant partners:
${allMerchants.map(m => `- ${m.name} (${m.category})`).join("\n")}

Existing moments already on the calendar (do NOT duplicate):
${existingMomentsList}

Focus on real, specific events that will actually occur in the time window above. Be specific about names and dates.`;

  const raw = await callClaude({
    system: systemPrompt,
    user: userMessage,
    model: "claude-sonnet-4-6",
    maxTokens: 4096,
    temperature: 0.4,
  });
  let candidates: DiscoverCandidate[];
  try {
    candidates = parseJSON<DiscoverCandidate[]>(raw);
  } catch {
    console.error("[discover] JSON parse failed:", raw.slice(0, 500));
    return NextResponse.json({ error: "AI returned invalid JSON", raw: raw.slice(0, 500) }, { status: 502 });
  }

  // Filter: minScore (structured mode) + must start after today + 30 days
  const cutoff = toYMD(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30));

  if (isStructured) {
    const minScore = (body.settings as FeedSettings).minScore ?? 0;
    candidates = candidates.filter(c => c.score >= minScore);
  }
  // Always filter out candidates that start within 30 days
  candidates = candidates.filter(c => c.startDate > cutoff);

  // ── Deduplication ───────────────────────────────────────────────────────────
  const [existingCandidates, existingMoments] = await Promise.all([
    db.select({ name: feedCandidates.name }).from(feedCandidates)
      .where(ne(feedCandidates.status, "dismissed")),
    db.select({ name: moments.name }).from(moments),
  ]);
  const allExistingNames = new Set([
    ...existingCandidates.map(r => r.name.toLowerCase().trim()),
    ...existingMoments.map(r => r.name.toLowerCase().trim()),
  ]);

  // Deduplicate against DB and within batch
  const seen = new Set<string>();
  candidates = candidates.filter(c => {
    const key = c.name.toLowerCase().trim();
    if (allExistingNames.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // ── Insert feed candidates ──────────────────────────────────────────────────
  const inserted = [];
  for (const c of candidates) {
    const [row] = await db
      .insert(feedCandidates)
      .values({
        name:      c.name,
        startDate: c.startDate,
        endDate:   c.endDate ?? null,
        category:  c.category,
        score:     c.score,
        headline:  c.headline,
        body:      c.body,
        why:       c.why,
        hook:      Array.isArray(c.hook) ? c.hook.join(", ") : (c.hook ?? ""),
        partners:  JSON.stringify(Array.isArray(c.partners) ? c.partners : []),
        personas:  JSON.stringify(Array.isArray(c.personas) ? c.personas : []),
        hashtags:  JSON.stringify(Array.isArray(c.hashtags) ? c.hashtags : []),
        competing: JSON.stringify(Array.isArray(c.competing) ? c.competing : []),
        status:    "pending",
      })
      .returning();
    inserted.push(row);
  }

  // ── Reconcile partner names → create unknown ones as "potential" ─────────────
  const newMerchantsByCandidate: Record<string, number> = {};
  for (const c of candidates) {
    if (!Array.isArray(c.partners) || c.partners.length === 0) continue;
    let newCount = 0;
    for (const partnerName of c.partners) {
      const trimmed = partnerName.trim();
      if (!trimmed) continue;
      const existing = await db.query.merchants.findFirst({
        where: sql`lower(${merchants.name}) = lower(${trimmed})`,
      });
      if (!existing) {
        await db.insert(merchants).values({
          id: createId(),
          name: trimmed,
          category: "Unknown",
          partnerStatus: "potential",
          partnerGroup: null,
          seasonalNotes: `Auto-suggested by feed discovery for: ${c.name}`,
        }).onConflictDoNothing();
        newCount++;
      }
    }
    newMerchantsByCandidate[c.name] = newCount;
  }

  // Attach newMerchantCount to each returned candidate row
  const enriched = inserted.map(row => ({
    ...row,
    newMerchantCount: newMerchantsByCandidate[row.name] ?? 0,
  }));

  return NextResponse.json({ candidates: enriched });
}

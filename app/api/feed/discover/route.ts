import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { merchants, moments, feedCandidates } from "@/lib/db/schema";
import { groq, parseJSON } from "@/lib/ai";
import { DISCOVER_SYSTEM_PROMPT } from "@/lib/prompts";
import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";

export const maxDuration = 60;

if (!process.env.GROQ_API_KEY) {
  console.warn("[discover] GROQ_API_KEY is not set");
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
- Minimum fit score: ${settings.minScore.toFixed(1)}/5.0`;
}

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "API key not configured. Add GROQ_API_KEY to .env.local." },
      { status: 503 }
    );
  }

  const body = await req.json();
  const isStructured = !!body.settings;

  let queryLine: string;
  if (isStructured) {
    queryLine = buildStructuredQuery(body.settings as FeedSettings);
  } else {
    const query: string = (body.query ?? "").trim();
    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }
    queryLine = `Query: ${query}`;
  }

  const [allMerchants, allMoments] = await Promise.all([
    db.select({ name: merchants.name, category: merchants.category }).from(merchants),
    db.select({ name: moments.name, startDate: moments.startDate }).from(moments),
  ]);

  // Build richer existing-moments context with dates so the model avoids overlapping windows
  const latestExistingDate = allMoments.reduce((max, m) => m.startDate > max ? m.startDate : max, "2000-01-01");
  const existingMomentsList = allMoments
    .map(m => `${m.name} (${m.startDate})`)
    .join(", ");

  const userMessage = `${queryLine}

Available merchant partners:
${allMerchants.map(m => `- ${m.name} (${m.category})`).join("\n")}

Existing moments already on the calendar (do NOT suggest anything that overlaps with these dates or duplicates these events):
${existingMomentsList}

Only suggest moments that start AFTER ${latestExistingDate} or that are clearly distinct from anything above.`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: DISCOVER_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    max_tokens: 4096,
    temperature: 0.4,
  });

  const raw = completion.choices[0].message.content ?? "";
  let candidates: DiscoverCandidate[];
  try {
    candidates = parseJSON<DiscoverCandidate[]>(raw);
  } catch {
    console.error("[discover] JSON parse failed:", raw.slice(0, 500));
    return NextResponse.json({ error: "AI returned invalid JSON", raw: raw.slice(0, 500) }, { status: 502 });
  }

  // Filter: minScore (structured mode) + must start after today + 30 days
  const today = new Date();
  const cutoff = toYMD(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30));

  if (isStructured) {
    const minScore = (body.settings as FeedSettings).minScore ?? 0;
    candidates = candidates.filter(c => c.score >= minScore);
  }
  // Always filter out candidates that start within 30 days
  candidates = candidates.filter(c => c.startDate > cutoff);

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

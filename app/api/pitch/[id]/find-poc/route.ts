import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pitches, merchants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaude } from "@/lib/ai";
import { extractJSONSafe } from "@/lib/json-utils";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function searchWeb(query: string): Promise<string> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
        { headers: { Accept: "application/json", "X-Subscription-Token": apiKey } }
      );
      if (res.ok) {
        const data = await res.json();
        const snippets = (data.web?.results ?? [])
          .map((r: any) => `${r.title}: ${r.description} (${r.url})`)
          .join("\n");
        return snippets;
      }
    } catch { /* fall through */ }
  }
  return "";
}

const FALLBACK_GUIDANCE = "Contact search is temporarily unavailable. Search LinkedIn for 'Director of Partnerships' or 'VP Co-Marketing' at this merchant, or check their corporate press page for business development contacts.";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [pitch] = await db.select().from(pitches).where(eq(pitches.id, id)).limit(1);
    if (!pitch) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [merchant] = pitch.merchantId
      ? await db.select().from(merchants).where(eq(merchants.id, pitch.merchantId)).limit(1)
      : [null];

    const merchantName = merchant?.name ?? "this merchant";
    const merchantCategory = merchant?.category ?? "retail";
    const searchQuery = `${merchantName} director partnerships marketing contact Apple Pay co-marketing`;

    const searchResults = await searchWeb(searchQuery);
    const hasResults = searchResults.trim().length > 0;

    const system = `You are helping identify business contacts at companies for partnership outreach.
Return ONLY valid JSON. No markdown, no text outside the JSON.`;

    const prompt = hasResults
      ? `Based on these web search results, identify likely Points of Contact (POCs) for partnership outreach at ${merchantName}.

SEARCH RESULTS:
${searchResults}

SEARCH QUERY USED: "${searchQuery}"

Return a JSON object:
{
  "pocs": [
    {
      "name": "<full name or null if not found>",
      "title": "<job title>",
      "confidence": "confirmed",
      "source": "<where this came from>",
      "linkedinHint": "<LinkedIn search URL or null>",
      "notes": "<any relevant context>"
    }
  ],
  "searchSucceeded": true,
  "guidance": "<1-2 sentences of additional outreach advice specific to ${merchantName}>"
}

Only include contacts directly relevant to partnership, co-marketing, or payments integrations. Confidence must be one of: "confirmed", "likely", "inferred". If no specific individuals are found but the company has a known partnerships team, return that as a "likely" entry.`

      : `No web search results were found for ${merchantName} partnership contacts.

Return a JSON object with guidance on where to find contacts:
{
  "pocs": [],
  "searchSucceeded": false,
  "guidance": "<2-3 sentences: Where to look for partnership/co-marketing contacts at ${merchantName}. Include specific suggestions: LinkedIn title searches, company partnerships/press pages, industry event speaker lists, or known conference appearances. Be specific to ${merchantName}'s industry: ${merchantCategory}.>"
}`;

    let text: string;
    try {
      text = await callClaude({
        system,
        user: prompt,
        model: "claude-haiku-4-5-20251001",
        maxTokens: 800,
      });
    } catch (err: any) {
      // Claude unavailable — return helpful fallback, don't throw
      const fallback = { pocs: [], searchSucceeded: false, guidance: `Unable to search right now. ${FALLBACK_GUIDANCE}` };
      return NextResponse.json(fallback);
    }

    const result: any = extractJSONSafe(text, { pocs: [], searchSucceeded: false, guidance: FALLBACK_GUIDANCE });

    await db.update(pitches).set({
      pocSearchResults: JSON.stringify(result),
      pocSearchedAt: new Date(),
      pocSearchQuery: searchQuery,
      updatedAt: new Date(),
    }).where(eq(pitches.id, id));

    return NextResponse.json(result);

  } catch {
    return NextResponse.json({
      pocs: [],
      searchSucceeded: false,
      guidance: FALLBACK_GUIDANCE,
    });
  }
}

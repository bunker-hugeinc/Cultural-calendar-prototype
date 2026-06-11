import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { merchants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaude } from "@/lib/ai";
import { buildCompetitorAnalysisPrompt } from "@/lib/prompts";
import { getCachedOrGenerate } from "@/lib/ai-cache";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forceRefresh = new URL(req.url).searchParams.get("refresh") === "true";

  const [merchant] = await db.select().from(merchants).where(eq(merchants.id, id)).limit(1);
  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, fromCache, generatedAt } = await getCachedOrGenerate({
    entity: "merchant",
    entityId: id,
    outputType: "competitor",
    forceRefresh,
    generate: async () => {
      const { system, user } = buildCompetitorAnalysisPrompt("merchant", {
        name: merchant.name,
        description: merchant.notes ?? undefined,
        category: merchant.category,
      });
      const text = await callClaude({ system, user, model: "claude-haiku-4-5-20251001", maxTokens: 800 });
      return JSON.parse(text.trim().replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, ""));
    },
  });

  return NextResponse.json({ ...(data as object), fromCache, generatedAt });
}

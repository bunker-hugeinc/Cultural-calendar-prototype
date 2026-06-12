import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaude } from "@/lib/ai";
import { buildCompetitorAnalysisPrompt } from "@/lib/prompts";
import { getCachedOrGenerate } from "@/lib/ai-cache";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forceRefresh = new URL(req.url).searchParams.get("refresh") === "true";

  const [moment] = await db.select().from(moments).where(eq(moments.id, id)).limit(1);
  if (!moment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, fromCache, generatedAt } = await getCachedOrGenerate({
    entity: "moment",
    entityId: id,
    outputType: "competitor",
    forceRefresh,
    generate: async () => {
      const { system, user } = buildCompetitorAnalysisPrompt("moment", {
        name: moment.name,
        description: moment.description,
        category: moment.category,
        date: moment.startDate,
      });
      const text = await callClaude({ system, user, model: "claude-haiku-4-5-20251001", maxTokens: 800 });
      const { extractJSON } = await import("@/lib/json-utils");
      return extractJSON(text);
    },
  });

  return NextResponse.json({ ...(data as object), fromCache, generatedAt });
}
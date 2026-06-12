import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const ARRAY_FIELDS = [
  "businessObjectives", "deliverables", "successMetrics",
  "additionalReferences", "messagingHierarchy", "creativeTacticalConsiderations",
];

function parse(v: unknown): unknown {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return v ? [v] : []; }
  }
  return [];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pitchId } = await params;
  const [brief] = await db.select().from(briefs).where(eq(briefs.pitchId, pitchId)).limit(1);

  if (!brief) return NextResponse.json(null, { status: 404 });

  const out: Record<string, unknown> = { ...brief };
  for (const f of ARRAY_FIELDS) {
    out[f] = parse(brief[f as keyof typeof brief]);
  }
  return NextResponse.json(out);
}

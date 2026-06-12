import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ARRAY_FIELDS = [
  "businessObjectives", "deliverables", "successMetrics",
  "additionalReferences", "messagingHierarchy", "creativeTacticalConsiderations",
];

function tryParseJSON(val: string | null, fallback: unknown) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [brief] = await db.select().from(briefs).where(eq(briefs.id, id)).limit(1);
  if (!brief) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const out: Record<string, unknown> = { ...brief };
  for (const f of ARRAY_FIELDS) {
    out[f] = tryParseJSON(brief[f as keyof typeof brief] as string | null, []);
  }
  return NextResponse.json(out);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contentType = request.headers.get("content-type") ?? "";
  let body: Record<string, unknown>;
  if (contentType.includes("application/json")) {
    body = await request.json();
  } else {
    const text = await request.text();
    try { body = JSON.parse(text); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  }

  const toSave: Record<string, unknown> = { updatedAt: new Date(), lastAutoSavedAt: new Date() };
  const ALLOWED = [
    "toplineOverview", "audience", "timingNotes", "foundationalInsights", "status",
    ...ARRAY_FIELDS,
  ];
  for (const key of ALLOWED) {
    if (key in body) {
      toSave[key] = Array.isArray(body[key]) ? JSON.stringify(body[key]) : body[key];
    }
  }

  await db.update(briefs).set(toSave).where(eq(briefs.id, id));
  return NextResponse.json({ success: true });
}

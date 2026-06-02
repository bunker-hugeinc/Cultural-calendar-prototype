import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedCandidates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const candidate = await db.query.feedCandidates.findFirst({
    where: eq(feedCandidates.id, id),
  });
  if (!candidate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (candidate.status !== "dismissed") {
    return NextResponse.json({ error: "Candidate is not dismissed" }, { status: 409 });
  }

  await db
    .update(feedCandidates)
    .set({ status: "pending" })
    .where(eq(feedCandidates.id, id));

  return NextResponse.json({ ok: true });
}

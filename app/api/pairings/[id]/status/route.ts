import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pairingScores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const VALID_STATUSES = ["draft", "in_review", "approved", "live"] as const;
type PairingStatus = typeof VALID_STATUSES[number];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const status: PairingStatus = body.status;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(pairingScores)
    .set({ status, updatedAt: new Date() })
    .where(eq(pairingScores.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

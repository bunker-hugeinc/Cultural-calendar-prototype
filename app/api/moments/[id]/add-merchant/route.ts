import { db } from "@/lib/db";
import { momentMerchants } from "@/lib/db/schema";
import { createId } from "@paralleldrive/cuid2";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: momentId } = await params;
  try {
    const { merchantId, notes, activationType } = await request.json();
    if (!merchantId) return Response.json({ error: "merchantId required" }, { status: 400 });

    await db
      .insert(momentMerchants)
      .values({
        id: createId(),
        momentId,
        merchantId,
        notes: notes ?? null,
        activationType: activationType ?? "follow_up",
        addedBy: "direct",
      })
      .onConflictDoNothing();

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

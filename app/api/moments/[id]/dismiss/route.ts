export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { moments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db
      .update(moments)
      .set({ status: "dismissed", updatedAt: new Date() })
      .where(eq(moments.id, id));
    return Response.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

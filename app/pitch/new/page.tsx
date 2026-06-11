import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { pitches, moments, merchants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function NewPitchPage({
  searchParams,
}: {
  searchParams: Promise<{ momentId?: string; merchantId?: string }>;
}) {
  const { momentId, merchantId } = await searchParams;

  if (!momentId) redirect("/pitch");

  // Fetch names to build a meaningful title
  const [moment] = await db
    .select({ name: moments.name })
    .from(moments)
    .where(eq(moments.id, momentId))
    .limit(1);

  const [merchant] = merchantId
    ? await db
        .select({ name: merchants.name })
        .from(merchants)
        .where(eq(merchants.id, merchantId))
        .limit(1)
    : [null];

  const title = merchant
    ? `Apple Pay × ${merchant.name} — ${moment?.name ?? "Untitled"}`
    : `Apple Pay — ${moment?.name ?? "Untitled"}`;

  const [pitch] = await db
    .insert(pitches)
    .values({
      title,
      momentId,
      merchantId: merchantId ?? null,
      status: "draft",
    })
    .returning();

  redirect(`/pitch/${pitch.id}?generate=true`);
}

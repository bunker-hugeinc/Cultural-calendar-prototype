import Link from "next/link";
import { db } from "@/lib/db";
import { pitches, pitchMoments, pitchMerchants, moments, merchants } from "@/lib/db/schema";
import { desc, inArray } from "drizzle-orm";
import { PitchListClient, type PitchRow } from "@/components/pitch-list-client";

export const dynamic = "force-dynamic";

export default async function PitchesPage() {
  const rows = await db.select().from(pitches).orderBy(desc(pitches.updatedAt));

  let enriched: PitchRow[] = [];

  if (rows.length > 0) {
    const pitchIds = rows.map(p => p.id);
    const [momentLinks, merchantLinks] = await Promise.all([
      db.select({ pitchId: pitchMoments.pitchId, momentId: pitchMoments.momentId, isPrimary: pitchMoments.isPrimary })
        .from(pitchMoments).where(inArray(pitchMoments.pitchId, pitchIds)),
      db.select({ pitchId: pitchMerchants.pitchId, merchantId: pitchMerchants.merchantId, isPrimary: pitchMerchants.isPrimary })
        .from(pitchMerchants).where(inArray(pitchMerchants.pitchId, pitchIds)),
    ]);

    // Include both join-table links and the direct FK columns (auto-generated pitches use the FKs).
    const momentIds = [...new Set([
      ...momentLinks.map(l => l.momentId),
      ...rows.map(r => r.momentId).filter(Boolean) as string[],
    ])];
    const merchantIds = [...new Set([
      ...merchantLinks.map(l => l.merchantId),
      ...rows.map(r => r.merchantId).filter(Boolean) as string[],
    ])];

    const [momentNames, merchantNames] = await Promise.all([
      momentIds.length ? db.select({ id: moments.id, name: moments.name }).from(moments).where(inArray(moments.id, momentIds)) : Promise.resolve([]),
      merchantIds.length ? db.select({ id: merchants.id, name: merchants.name }).from(merchants).where(inArray(merchants.id, merchantIds)) : Promise.resolve([]),
    ]);

    const momentNameMap = new Map(momentNames.map(m => [m.id, m.name]));
    const merchantNameMap = new Map(merchantNames.map(m => [m.id, m.name]));

    enriched = rows.map(pitch => {
      const pm = momentLinks.filter(l => l.pitchId === pitch.id);
      const pmr = merchantLinks.filter(l => l.pitchId === pitch.id);
      const primaryMoment = pm.find(l => l.isPrimary) ?? pm[0];
      const primaryMerchant = pmr.find(l => l.isPrimary) ?? pmr[0];
      return {
        id: pitch.id,
        title: pitch.title,
        type: pitch.type,
        status: pitch.status,
        targetQuarter: pitch.targetQuarter,
        updatedAt: pitch.updatedAt ? pitch.updatedAt.toISOString() : null,
        primaryMomentName: primaryMoment
          ? (momentNameMap.get(primaryMoment.momentId) ?? null)
          : (pitch.momentId ? momentNameMap.get(pitch.momentId) ?? null : null),
        primaryMerchantName: primaryMerchant
          ? (merchantNameMap.get(primaryMerchant.merchantId) ?? null)
          : (pitch.merchantId ? merchantNameMap.get(pitch.merchantId) ?? null : null),
      };
    });
  }

  return (
    <div style={{ padding: "40px 24px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 4 }}>PITCH BUILDER</p>
          <h1>Pitches</h1>
        </div>
        <Link href="/calendar" className="btn btn-primary" style={{ textDecoration: "none" }}>
          + New Pitch
        </Link>
      </div>

      {enriched.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 24px" }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>NO PITCHES YET</p>
          <h2 style={{ marginBottom: 8, fontSize: "1.3rem" }}>Start building a pitch</h2>
          <p style={{ fontSize: "0.9rem", color: "#86868b", marginBottom: 32 }}>
            Begin from a cultural moment or a merchant — both paths lead here.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/calendar" className="btn btn-primary" style={{ textDecoration: "none" }}>
              Start with a moment →
            </Link>
            <Link href="/merchants" className="btn btn-outline" style={{ textDecoration: "none" }}>
              Start with a merchant →
            </Link>
          </div>
        </div>
      ) : (
        <PitchListClient initialPitches={enriched} />
      )}
    </div>
  );
}

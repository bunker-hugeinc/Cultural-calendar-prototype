import Link from "next/link";
import { db } from "@/lib/db";
import { pitches, pitchMoments, pitchMerchants, moments, merchants } from "@/lib/db/schema";
import { desc, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function PitchesPage() {
  const rows = await db.select().from(pitches).orderBy(desc(pitches.updatedAt));

  let enriched: Array<typeof rows[0] & { primaryMomentName: string | null; primaryMerchantName: string | null }> = [];

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
        ...pitch,
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
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {enriched.map(pitch => (
            <Link key={pitch.id} href={`/pitch/${pitch.id}`} style={{ textDecoration: "none" }}>
              <div className="card-p" style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1d1d1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {pitch.title}
                    </h3>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {pitch.primaryMomentName && (
                      <span style={{ fontSize: "0.75rem", color: "#6e6e73" }}>📅 {pitch.primaryMomentName}</span>
                    )}
                    {pitch.primaryMerchantName && (
                      <span style={{ fontSize: "0.75rem", color: "#6e6e73" }}>🏪 {pitch.primaryMerchantName}</span>
                    )}
                    {pitch.targetQuarter && (
                      <span style={{ fontSize: "0.75rem", color: "#86868b" }}>{pitch.targetQuarter}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  <span style={{
                    fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                    background: pitch.type === "moment_led" ? "#e3f2fd" : "#e8f5e9",
                    color: pitch.type === "moment_led" ? "#0071e3" : "#248a3d",
                  }}>
                    {pitch.type === "moment_led" ? "Moment-Led" : "Merchant-Led"}
                  </span>
                  <span style={{
                    fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                    background: pitch.status === "ready" ? "rgba(52,199,89,0.12)" : "#f5f5f7",
                    color: pitch.status === "ready" ? "#248a3d" : "#86868b",
                  }}>
                    {pitch.status === "ready" ? "Ready" : "Draft"}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#86868b" }}>
                    {formatDate(pitch.updatedAt)}
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "#0071e3", fontWeight: 500 }}>Open →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

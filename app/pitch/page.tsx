import Link from "next/link";
import { db } from "@/lib/db";
import { pitches, moments, merchants } from "@/lib/db/schema";
import { desc, eq, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  draft:    { label: "Draft",    bg: "#f5f5f7",             color: "#6e6e73" },
  sent:     { label: "Sent",     bg: "#e3f2fd",             color: "#0071e3" },
  approved: { label: "Approved", bg: "rgba(52,199,89,0.1)", color: "#248a3d" },
  rejected: { label: "Rejected", bg: "rgba(255,59,48,0.1)", color: "#cc2200" },
  ready:    { label: "Ready",    bg: "rgba(52,199,89,0.1)", color: "#248a3d" },
};

export default async function PitchListPage() {
  const rows = await db.select().from(pitches).orderBy(desc(pitches.updatedAt));

  // Enrich with moment/merchant names for auto-populated pitches
  const momentIds = rows.map(p => p.momentId).filter(Boolean) as string[];
  const merchantIds = rows.map(p => p.merchantId).filter(Boolean) as string[];

  const [momentNames, merchantNames] = await Promise.all([
    momentIds.length ? db.select({ id: moments.id, name: moments.name }).from(moments).where(inArray(moments.id, momentIds)) : Promise.resolve([]),
    merchantIds.length ? db.select({ id: merchants.id, name: merchants.name }).from(merchants).where(inArray(merchants.id, merchantIds)) : Promise.resolve([]),
  ]);

  const momentMap = new Map(momentNames.map(m => [m.id, m.name]));
  const merchantMap = new Map(merchantNames.map(m => [m.id, m.name]));

  const groups: Record<string, typeof rows> = { approved: [], sent: [], draft: [], ready: [], rejected: [] };
  for (const p of rows) {
    const bucket = groups[p.status] ? p.status : "draft";
    groups[bucket].push(p);
  }

  const groupOrder = ["approved", "sent", "draft", "ready", "rejected"];
  const nonEmpty = groupOrder.filter(g => groups[g]?.length > 0);

  return (
    <div style={{ padding: "40px 24px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 4 }}>PITCH BUILDER</p>
          <h1>Pitches</h1>
        </div>
        <Link href="/pitches/new" className="btn btn-primary" style={{ textDecoration: "none" }}>
          + New Pitch
        </Link>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 24px" }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>NO PITCHES YET</p>
          <h2 style={{ marginBottom: 8, fontSize: "1.3rem" }}>Start building a pitch</h2>
          <p style={{ fontSize: "0.9rem", color: "#86868b", marginBottom: 32 }}>
            Use the Quick Pitch button on any moment × merchant pairing, or create manually.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/calendar" className="btn btn-primary" style={{ textDecoration: "none" }}>Start with a moment →</Link>
            <Link href="/merchants" className="btn btn-outline" style={{ textDecoration: "none" }}>Start with a merchant →</Link>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {nonEmpty.map(group => (
            <div key={group}>
              <p className="eyebrow" style={{ marginBottom: 12 }}>{STATUS_META[group]?.label.toUpperCase() ?? group.toUpperCase()} ({groups[group].length})</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {groups[group].map(pitch => {
                  const meta = STATUS_META[pitch.status] ?? STATUS_META.draft;
                  const momentName = pitch.momentId ? momentMap.get(pitch.momentId) : null;
                  const merchantName = pitch.merchantId ? merchantMap.get(pitch.merchantId) : null;
                  return (
                    <Link key={pitch.id} href={`/pitch/${pitch.id}`} style={{ textDecoration: "none" }}>
                      <div className="card-p" style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1d1d1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
                            {pitch.title}
                          </h3>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            {momentName && <span style={{ fontSize: "0.75rem", color: "#6e6e73" }}>📅 {momentName}</span>}
                            {merchantName && <span style={{ fontSize: "0.75rem", color: "#6e6e73" }}>🏪 {merchantName}</span>}
                            {pitch.targetQuarter && <span style={{ fontSize: "0.75rem", color: "#86868b" }}>{pitch.targetQuarter}</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: meta.bg, color: meta.color, flexShrink: 0 }}>
                          {meta.label}
                        </span>
                        <span style={{ fontSize: "0.82rem", color: "#0071e3", fontWeight: 500, flexShrink: 0 }}>Open →</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { db } from "@/lib/db";
import { moments, merchants, pitches, feedCandidates } from "@/lib/db/schema";
import { eq, gte, lte, desc, and, ne } from "drizzle-orm";
import Link from "next/link";
import { UpcomingMoments } from "@/components/upcoming-moments";

export const dynamic = "force-dynamic";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, n: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}


export default async function DashboardPage() {
  const today = todayStr();
  const cutoff90 = addDays(today, 90);

  const [allMoments, allMerchants, allPitches, pendingFeed, upcoming, recentPitches, topFeed] = await Promise.all([
    db.select({ id: moments.id }).from(moments),
    db.select({ id: merchants.id }).from(merchants),
    db.select({ id: pitches.id }).from(pitches),
    db.select({ id: feedCandidates.id }).from(feedCandidates).where(eq(feedCandidates.status, "pending")),
    db.select({
      id: moments.id, name: moments.name, startDate: moments.startDate,
      category: moments.category, score: moments.score,
    }).from(moments)
      .where(and(
        gte(moments.startDate, today),
        lte(moments.startDate, cutoff90),
        ne(moments.status, "dismissed"),
      ))
      .orderBy(desc(moments.score))
      .limit(4),
    db.select({
      id: pitches.id, title: pitches.title, type: pitches.type,
      status: pitches.status, updatedAt: pitches.updatedAt,
    }).from(pitches)
      .orderBy(desc(pitches.updatedAt))
      .limit(3),
    db.select({
      id: feedCandidates.id, name: feedCandidates.name,
      score: feedCandidates.score, category: feedCandidates.category,
      headline: feedCandidates.headline,
    }).from(feedCandidates)
      .where(eq(feedCandidates.status, "pending"))
      .orderBy(desc(feedCandidates.score))
      .limit(3),
  ]);

  return (
    <div style={{ padding: "48px 24px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Dashboard hero — single decision point */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#1d1d1f", marginBottom: 4 }}>Apple Pay Partner Marketing</h1>
        <p style={{ fontSize: "0.9rem", color: "#86868b", marginBottom: 24 }}>
          Find the right moment, the right merchant, and build the pitch.
        </p>

        {/* Single two-option decision */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, maxWidth: 520 }}>
          <a
            href="/feed"
            className="card-apple"
            style={{ display: "flex", flexDirection: "column", gap: 6, padding: "16px 18px", textDecoration: "none", border: "1px solid #e8e8ed", transition: "border-color 0.15s" }}
          >
            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1d1d1f" }}>Start with a moment</span>
            <span style={{ fontSize: "0.78rem", color: "#86868b", lineHeight: 1.5 }}>
              Browse cultural moments and find the best merchant partners
            </span>
          </a>
          <a
            href="/merchants"
            className="card-apple"
            style={{ display: "flex", flexDirection: "column", gap: 6, padding: "16px 18px", textDecoration: "none", border: "1px solid #e8e8ed", transition: "border-color 0.15s" }}
          >
            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1d1d1f" }}>Start with a merchant</span>
            <span style={{ fontSize: "0.78rem", color: "#86868b", lineHeight: 1.5 }}>
              Find the best moment opportunities for a specific partner
            </span>
          </a>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 48, flexWrap: "wrap" }}>
        {[
          { label: "Moments on calendar", value: allMoments.length, href: "/calendar" },
          { label: "Merchants in catalog", value: allMerchants.length, href: "/merchants" },
          { label: "Pitches in progress",  value: allPitches.length,   href: "/pitch" },
          { label: "AI suggestions pending", value: pendingFeed.length, href: "/feed" },
        ].map(({ label, value, href }) => (
          <a key={label} href={href} style={{ textDecoration: "none", flex: 1, minWidth: 140 }}>
            <div className="card-apple" style={{ textAlign: "center", padding: "16px 20px" }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1d1d1f", lineHeight: 1 }}>{value}</div>
              <div className="eyebrow" style={{ marginTop: 4 }}>{label}</div>
            </div>
          </a>
        ))}
      </div>

      {/* Upcoming moments */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Upcoming moments <span style={{ color: "#86868b", fontWeight: 400, fontSize: "0.85rem" }}>(next 90 days)</span></h2>
          <Link href="/calendar" style={{ fontSize: "0.85rem", color: "#0071e3", textDecoration: "none" }}>View all →</Link>
        </div>
        <UpcomingMoments initialMoments={upcoming} />
      </div>

      {/* Recent pitches + Feed preview side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>

        {/* Recent pitches */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Recent pitches</h2>
            <Link href="/pitch" style={{ fontSize: "0.85rem", color: "#0071e3", textDecoration: "none" }}>View all →</Link>
          </div>
          {recentPitches.length === 0 ? (
            <div className="card-apple" style={{ padding: "24px 20px", textAlign: "center" }}>
              <p style={{ fontSize: "0.9rem", color: "#86868b", marginBottom: 12 }}>No pitches yet.</p>
              <Link href="/calendar" className="btn btn-outline btn-sm">Create first pitch →</Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentPitches.map(p => (
                <Link key={p.id} href={`/pitch/${p.id}`} style={{ textDecoration: "none" }}>
                  <div className="card-apple" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#1d1d1f", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
                    </div>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 600, padding: "2px 7px", borderRadius: 10, flexShrink: 0,
                      background: p.type === "moment_led" ? "#e8f0fe" : "#e8f5e9",
                      color: p.type === "moment_led" ? "#0071e3" : "#248a3d",
                    }}>
                      {p.type === "moment_led" ? "Moment-led" : "Merchant-led"}
                    </span>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 600, padding: "2px 7px", borderRadius: 10, flexShrink: 0,
                      background: p.status === "ready" ? "#e8f5e9" : "#f5f5f7",
                      color: p.status === "ready" ? "#248a3d" : "#86868b",
                    }}>
                      {p.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Feed preview */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>AI feed</h2>
            <Link href="/feed" style={{ fontSize: "0.85rem", color: "#0071e3", textDecoration: "none" }}>View all in Feed →</Link>
          </div>
          {topFeed.length === 0 ? (
            <div className="card-apple" style={{ padding: "24px 20px", textAlign: "center" }}>
              <p style={{ fontSize: "0.9rem", color: "#86868b" }}>No pending AI suggestions.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {topFeed.map(f => (
                <Link key={f.id} href="/feed" style={{ textDecoration: "none" }}>
                  <div className="card-apple" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#1d1d1f", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "#86868b", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.headline}</div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1d1d1f" }}>{f.score.toFixed(1)}</div>
                      <div style={{ fontSize: "0.65rem", color: "#86868b" }}>score</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

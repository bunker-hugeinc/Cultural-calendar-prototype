import { db } from "@/lib/db";
import { moments, merchants, pitches, feedCandidates } from "@/lib/db/schema";
import { eq, gte, lte, desc, and } from "drizzle-orm";
import Link from "next/link";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, n: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CATEGORY_COLORS: Record<string, string> = {
  gather:  "#5856d6",
  improve: "#248a3d",
  excite:  "#ff6200",
};

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
      .where(and(gte(moments.startDate, today), lte(moments.startDate, cutoff90)))
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

      {/* Header */}
      <div style={{ marginBottom: 48, textAlign: "center" }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>APPLE PAY PARTNER MARKETING</p>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 700, color: "#1d1d1f", marginBottom: 12 }}>
          Campaign Planning Tool
        </h1>
        <p style={{ fontSize: "1rem", color: "#86868b", marginBottom: 28 }}>
          Start from a cultural moment or a merchant — both paths lead to a pitch.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/calendar" className="btn btn-primary">Start with a Moment →</Link>
          <Link href="/merchants" className="btn btn-outline">Start with a Merchant →</Link>
        </div>
      </div>

      {/* Entry point cards */}
      <div style={{ display: "flex", gap: 20, marginBottom: 48 }}>
        <a href="/calendar" className="card-p" style={{ flex: 1, display: "block", textDecoration: "none" }}>
          <p className="eyebrow" style={{ color: "#0071e3", marginBottom: 8 }}>PHASE 1 — DISCOVERY</p>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8, color: "#1d1d1f" }}>Start with a moment</h2>
          <p style={{ fontSize: "0.9rem", color: "#86868b", marginBottom: 20 }}>
            Find a cultural moment, evaluate its Apple Pay fit, identify the right merchants, and build a partnership pitch.
          </p>
          <span className="btn btn-primary">Browse calendar →</span>
        </a>

        <a href="/merchants" className="card-p" style={{ flex: 1, display: "block", textDecoration: "none" }}>
          <p className="eyebrow" style={{ color: "#248a3d", marginBottom: 8 }}>PHASE 1 — DISCOVERY</p>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8, color: "#1d1d1f" }}>Start with a merchant</h2>
          <p style={{ fontSize: "0.9rem", color: "#86868b", marginBottom: 20 }}>
            Identify a current or potential partner, evaluate their fit, find the right moments to activate, and build a pitch.
          </p>
          <span className="btn btn-primary">Browse merchants →</span>
        </a>
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
        {upcoming.length === 0 ? (
          <p style={{ color: "#86868b", fontSize: "0.9rem" }}>No upcoming moments in the next 90 days.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {upcoming.map(m => (
              <Link key={m.id} href={`/moments/${m.id}`} style={{ textDecoration: "none" }}>
                <div className="card-apple" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#1d1d1f", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "0.75rem", color: "#86868b" }}>{formatDate(m.startDate)}</span>
                      <span style={{
                        fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 10,
                        background: CATEGORY_COLORS[m.category] ?? "#86868b",
                        color: "white", textTransform: "uppercase", letterSpacing: "0.04em",
                      }}>{m.category}</span>
                    </div>
                  </div>
                  {m.score != null && (
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1d1d1f" }}>{m.score.toFixed(1)}</div>
                      <div style={{ fontSize: "0.65rem", color: "#86868b" }}>score</div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
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

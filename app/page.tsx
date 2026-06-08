import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { moments, feedCandidates } from "@/lib/db/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { MomentCard } from "@/components/moment-card";
import { FilterBar } from "@/components/filter-bar";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, n: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function daysDiff(dateStr: string, from: string) {
  const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).getTime(); };
  return Math.round((parse(dateStr) - parse(from)) / 86400000);
}

function StatChip({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = (
    <div className="card-apple" style={{ textAlign: "center", padding: "14px 20px", minWidth: 140 }}>
      <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1d1d1f", lineHeight: 1 }}>{value}</div>
      <div className="eyebrow" style={{ marginTop: 4 }}>{label}</div>
    </div>
  );
  return href ? <a href={href} style={{ textDecoration: "none" }}>{content}</a> : content;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; days?: string }>;
}) {
  const { category, days } = await searchParams;
  const categoryFilter = category ?? "All";
  const daysFilter = parseInt(days ?? "90", 10);

  const today = todayStr();
  const cutoff = addDays(today, daysFilter);
  const cutoff90 = addDays(today, 90);

  const conditions = [gte(moments.startDate, today), lte(moments.startDate, cutoff)];
  if (categoryFilter !== "All") conditions.push(eq(moments.category, categoryFilter));

  const [rows, allMoments, pendingFeed] = await Promise.all([
    db.select().from(moments).where(and(...conditions)).orderBy(asc(moments.startDate)),
    db.select().from(moments),
    db.select().from(feedCandidates).where(eq(feedCandidates.status, "pending")),
  ]);

  const scoredCount = allMoments.filter(m => m.audienceRelevance || m.score).length;
  const upcoming90Count = allMoments.filter(m => m.startDate >= today && m.startDate <= cutoff90).length;

  return (
    <div style={{ padding: "40px 24px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 4 }}>Campaign Planning</p>
          <h1>Upcoming Moments</h1>
          <p style={{ fontSize: "0.85rem", color: "#86868b", marginTop: 4 }}>
            {rows.length} moment{rows.length !== 1 ? "s" : ""} in range
          </p>
        </div>
        <Link href="/moments/new" className="btn btn-primary">
          + Add Moment
        </Link>
      </div>

      {/* Stat chips */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
        <StatChip label="Moments on calendar" value={allMoments.length} />
        <StatChip label="Scored" value={scoredCount} />
        <StatChip label="Upcoming (90 days)" value={upcoming90Count} />
        <StatChip label="AI suggestions pending" value={pendingFeed.length} href="/feed" />
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 32 }}>
        <Suspense>
          <FilterBar />
        </Suspense>
      </div>

      {/* Grid */}
      {rows.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "96px 0", textAlign: "center" }}>
          <h3 style={{ color: "#1d1d1f" }}>No moments in this range</h3>
          <p style={{ fontSize: "0.85rem", color: "#86868b", marginTop: 8 }}>
            Try expanding the date range or changing the category filter.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {rows.map((m) => (
            <MomentCard
              key={m.id}
              id={m.id}
              name={m.name}
              startDate={m.startDate}
              endDate={m.endDate}
              category={m.category}
              daysAway={daysDiff(m.startDate, today)}
              score={m.score}
              audienceRelevance={m.audienceRelevance}
              productConnection={m.productConnection}
              partnerAlignment={m.partnerAlignment}
            />
          ))}
        </div>
      )}
    </div>
  );
}

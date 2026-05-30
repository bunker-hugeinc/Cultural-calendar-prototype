import type { Metadata } from "next";
import { db } from "@/lib/db";
import { moments, feedCandidates } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { CalendarView } from "@/components/calendar-view";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const [rows, feed] = await Promise.all([
    db
      .select({
        id: moments.id,
        name: moments.name,
        startDate: moments.startDate,
        endDate: moments.endDate,
        category: moments.category,
      })
      .from(moments)
      .orderBy(asc(moments.startDate)),
    db
      .select()
      .from(feedCandidates)
      .orderBy(asc(feedCandidates.startDate)),
  ]);

  return (
    <div style={{ background: "#eeeef0", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "28px 28px 80px" }}>
        <CalendarView initialMoments={rows} initialFeed={feed} />
      </div>
    </div>
  );
}

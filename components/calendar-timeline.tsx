"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  differenceInDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
  eachMonthOfInterval,
} from "date-fns";
import type { CalendarMoment } from "@/app/calendar/page";

// ─── Apple fiscal quarters ────────────────────────────────────────────────────
// Q1 = Oct–Dec  Q2 = Jan–Mar  Q3 = Apr–Jun  Q4 = Jul–Sep
function fiscalQLabel(d: Date): string {
  const mo = d.getMonth();
  const yr = d.getFullYear();
  if (mo >= 9) return `Q1 FY${yr + 1}`;
  if (mo <= 2)  return `Q2 FY${yr}`;
  if (mo <= 5)  return `Q3 FY${yr}`;
  return          `Q4 FY${yr}`;
}

// ─── Category colours ─────────────────────────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  gather:  "#34a853",
  improve: "#dc5078",
  excite:  "#0071e3",
};
const CAT_BG: Record<string, string> = {
  gather:  "rgba(52,168,83,0.10)",
  improve: "rgba(220,80,120,0.10)",
  excite:  "rgba(0,113,227,0.10)",
};

// Score → colour dot on bar
function scoreDotColor(score: number | null): string {
  if (score === null) return "rgba(134,134,139,0.4)";
  if (score >= 7)     return "#34c759";
  if (score >= 4)     return "#ff9f0a";
  return                     "#ff3b30";
}

// ─── Layout constants ─────────────────────────────────────────────────────────
const LABEL_W = 196; // px — sticky left column width
const ROW_H   = 44;  // px — moment row height
const HEAD_Q  = 26;  // px — quarter header height
const HEAD_M  = 30;  // px — month header height

// ─── Component ───────────────────────────────────────────────────────────────
export function CalendarTimeline({ moments }: { moments: CalendarMoment[] }) {
  const derived = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ── Compute visible date range ──
    const allDates = moments.flatMap(m => [
      parseISO(m.startDate),
      parseISO(m.endDate ?? m.startDate),
    ]);
    const minDate   = allDates.length ? allDates.reduce((a, b) => (a < b ? a : b)) : subMonths(today, 1);
    const maxDate   = allDates.length ? allDates.reduce((a, b) => (a > b ? a : b)) : addMonths(today, 6);
    const rangeStart = startOfMonth(subMonths(minDate, 1));
    const rangeEnd   = endOfMonth(addMonths(maxDate, 1));
    const totalDays  = differenceInDays(rangeEnd, rangeStart) + 1;

    // Convert a date → % of total track width
    const pct = (d: Date) => (differenceInDays(d, rangeStart) / totalDays) * 100;

    // ── Months ──
    const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });

    // ── Quarter segments ──
    const quarters: { label: string; leftPct: number; widthPct: number }[] = [];
    let qCur: { label: string; start: Date } | null = null;
    for (const m of months) {
      const lbl = fiscalQLabel(m);
      if (!qCur) { qCur = { label: lbl, start: m }; continue; }
      if (lbl !== qCur.label) {
        quarters.push({ label: qCur.label, leftPct: pct(qCur.start), widthPct: pct(m) - pct(qCur.start) });
        qCur = { label: lbl, start: m };
      }
    }
    if (qCur) quarters.push({ label: qCur.label, leftPct: pct(qCur.start), widthPct: 100 - pct(qCur.start) });

    // ── Month markers (for dividers + labels) ──
    const monthMarks = months.map(m => ({
      label:   format(m, "MMM"),
      leftPct: pct(startOfMonth(m)),
    }));

    // ── Today line ──
    const todayPct = today >= rangeStart && today <= rangeEnd ? pct(today) : null;

    // ── Bars ──
    const bars = moments.map(m => {
      const s = parseISO(m.startDate);
      const e = parseISO(m.endDate ?? m.startDate);
      const leftPct  = Math.max(0, pct(s));
      // +1 day inclusive; clamp to 100; min 2 days so single-day bars are visible
      const widthPct = Math.min(100 - leftPct, Math.max((differenceInDays(e, s) + 1) / totalDays * 100, 2 / totalDays * 100));
      return {
        leftPct,
        widthPct,
        showLabel: widthPct > 5,
      };
    });

    return { months, monthMarks, quarters, todayPct, bars };
  }, [moments]);

  const { monthMarks, quarters, todayPct, bars } = derived;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-apple-gray-100 overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <div style={{ minWidth: 820 }}>

          {/* ── Quarter header ───────────────────────────────────────── */}
          <div className="flex" style={{ height: HEAD_Q, borderBottom: "1px solid #e8e8ed" }}>
            {/* Corner cell */}
            <div
              className="shrink-0 sticky left-0 z-20 bg-[#f5f5f7]"
              style={{ width: LABEL_W, borderRight: "1px solid #e8e8ed" }}
            />
            {/* Quarter track */}
            <div className="relative flex-1 bg-[#f5f5f7]">
              {quarters.map((q, i) => (
                <div
                  key={i}
                  className="absolute inset-y-0 flex items-center px-3 overflow-hidden"
                  style={{ left: `${q.leftPct}%`, width: `${q.widthPct}%`, borderRight: "1px solid #e8e8ed" }}
                >
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-[#86868b] truncate whitespace-nowrap">
                    {q.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Month header ─────────────────────────────────────────── */}
          <div className="flex" style={{ height: HEAD_M, borderBottom: "1px solid #e8e8ed" }}>
            {/* "Moment" label */}
            <div
              className="shrink-0 sticky left-0 z-20 bg-[#f5f5f7] flex items-center px-4"
              style={{ width: LABEL_W, borderRight: "1px solid #e8e8ed" }}
            >
              <span className="text-[10px] font-semibold tracking-widest uppercase text-[#86868b]">
                Moment
              </span>
            </div>
            {/* Month labels */}
            <div className="relative flex-1 bg-[#f5f5f7]">
              {monthMarks.map((mm, i) => (
                <div
                  key={i}
                  className="absolute inset-y-0 flex items-center pl-2 overflow-hidden"
                  style={{
                    left: `${mm.leftPct}%`,
                    borderLeft: i > 0 ? "1px solid #e8e8ed" : undefined,
                  }}
                >
                  <span className="text-[11px] font-medium text-[#6e6e73] whitespace-nowrap">
                    {mm.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Moment rows ──────────────────────────────────────────── */}
          {moments.map((m, idx) => {
            const bar      = bars[idx];
            const color    = CAT_COLOR[m.category] ?? "#86868b";
            const bg       = CAT_BG[m.category]    ?? "rgba(134,134,139,0.10)";
            const dotColor = scoreDotColor(m.score);
            const rowBg    = idx % 2 === 1 ? "#fafafa" : "#ffffff";

            return (
              <div
                key={m.id}
                className="flex group"
                style={{ height: ROW_H, borderBottom: "1px solid #f5f5f7", backgroundColor: rowBg }}
              >
                {/* Sticky label column */}
                <div
                  className="shrink-0 sticky left-0 z-20 flex items-center px-3 gap-2"
                  style={{ width: LABEL_W, borderRight: "1px solid #f0f0f2", backgroundColor: rowBg }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <Link
                    href={`/moments/${m.id}`}
                    className="text-[13px] font-medium text-[#1d1d1f] hover:text-[#0071e3] transition-colors no-underline truncate leading-snug"
                    title={m.name}
                  >
                    {m.name}
                  </Link>
                </div>

                {/* Scrollable track */}
                <div className="relative flex-1 min-w-0">
                  {/* Month grid lines */}
                  {monthMarks.slice(1).map((mm, i) => (
                    <div
                      key={i}
                      className="absolute inset-y-0"
                      style={{ left: `${mm.leftPct}%`, borderLeft: "1px solid #f0f0f2" }}
                    />
                  ))}

                  {/* Today line */}
                  {todayPct !== null && (
                    <div
                      className="absolute inset-y-0 z-10 pointer-events-none"
                      style={{ left: `${todayPct}%`, borderLeft: "2px solid #0071e3", opacity: 0.55 }}
                    />
                  )}

                  {/* Bar */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 rounded-full flex items-center overflow-hidden"
                    style={{
                      left:            `${bar.leftPct}%`,
                      width:           `${bar.widthPct}%`,
                      height:          22,
                      backgroundColor: bg,
                      border:          `1.5px solid ${color}66`,
                    }}
                  >
                    {bar.showLabel && (
                      <span
                        className="pl-2 pr-6 text-[11px] font-medium truncate whitespace-nowrap leading-none"
                        style={{ color }}
                      >
                        {m.name}
                      </span>
                    )}

                    {/* Score dot — pinned to right end of bar */}
                    <span
                      className="absolute right-1.5 w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: dotColor }}
                      title={m.score !== null ? `Score: ${m.score}` : "Not scored"}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── Today label footer ───────────────────────────────────── */}
          {todayPct !== null && moments.length > 0 && (
            <div className="flex" style={{ height: 22 }}>
              <div className="shrink-0" style={{ width: LABEL_W }} />
              <div className="relative flex-1">
                <div
                  className="absolute flex items-center"
                  style={{ left: `${todayPct}%`, transform: "translateX(-50%)", top: 4 }}
                >
                  <span className="text-[10px] font-semibold" style={{ color: "#0071e3" }}>
                    Today
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

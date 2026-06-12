"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  parseISO,
  format,
  eachMonthOfInterval,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from "date-fns";
import type { CalendarMoment } from "@/app/calendar/page";

// ─── Apple fiscal quarters ────────────────────────────────────────────────────
function fiscalQLabel(d: Date): string {
  const mo = d.getMonth();
  const yr = d.getFullYear();
  if (mo >= 9) return `Q1 FY${String(yr + 1).slice(2)}`;
  if (mo <= 2)  return `Q2 FY${String(yr).slice(2)}`;
  if (mo <= 5)  return `Q3 FY${String(yr).slice(2)}`;
  return          `Q4 FY${String(yr).slice(2)}`;
}

// ─── Category colours ─────────────────────────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  gather:  "#34a853",
  improve: "#dc5078",
  excite:  "#0071e3",
};
const CAT_BG: Record<string, string> = {
  gather:  "rgba(52,168,83,0.08)",
  improve: "rgba(220,80,120,0.08)",
  excite:  "rgba(0,113,227,0.08)",
};
const CAT_BORDER: Record<string, string> = {
  gather:  "rgba(52,168,83,0.25)",
  improve: "rgba(220,80,120,0.25)",
  excite:  "rgba(0,113,227,0.25)",
};

function scoreTextColor(score: number | null): string {
  if (score === null) return "#d2d2d7";
  if (score >= 7)     return "#248a3d";
  if (score >= 4)     return "#c47c00";
  return                     "#cc2200";
}

// Date display for a moment
function momentDateLabel(m: CalendarMoment): string {
  const s = parseISO(m.startDate);
  if (!m.endDate || m.endDate === m.startDate) return format(s, "MMM d");
  const e = parseISO(m.endDate);
  // same month?
  if (format(s, "MMM") === format(e, "MMM")) return `${format(s, "MMM d")}–${format(e, "d")}`;
  return `${format(s, "MMM d")} – ${format(e, "MMM d")}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const color = scoreTextColor(score);
  const bg = score >= 7 ? "rgba(52,199,89,0.10)" : score >= 4 ? "rgba(255,159,10,0.10)" : "rgba(255,59,48,0.10)";
  return (
    <span
      className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full shrink-0"
      style={{ color, backgroundColor: bg }}
    >
      {score.toFixed(1)}
    </span>
  );
}

function MomentCard({ m, onRemove }: { m: CalendarMoment; onRemove?: (id: string) => void }) {
  const color  = CAT_COLOR[m.category]   ?? "#86868b";
  const bg     = CAT_BG[m.category]      ?? "rgba(134,134,139,0.08)";
  const border = CAT_BORDER[m.category]  ?? "rgba(134,134,139,0.20)";

  return (
    <Link
      href={`/moments/${m.id}`}
      className="block no-underline group"
    >
      <div
        className="rounded-xl p-3 transition-shadow hover:shadow-sm relative"
        style={{ backgroundColor: bg, border: `1px solid ${border}` }}
      >
        {onRemove && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove(m.id); }}
            title="Remove from calendar"
            className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(255,255,255,0.85)", border: "1px solid #e8e8ed", borderRadius: 6, width: 20, height: 20, lineHeight: 1, fontSize: 12, color: "#cc2200", cursor: "pointer" }}
          >
            ✕
          </button>
        )}
        {/* Name */}
        <p
          className="text-[13px] font-semibold leading-snug mb-1.5 group-hover:text-[#0071e3] transition-colors"
          style={{ color: "#1d1d1f", paddingRight: onRemove ? 18 : 0 }}
        >
          {m.name}
        </p>

        {/* Date + category pill + score badge + pitch count */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-[#86868b] tabular-nums">{momentDateLabel(m)}</span>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize"
            style={{ color, backgroundColor: `${color}18` }}
          >
            {m.category}
          </span>
          <ScoreBadge score={m.score} />
          {(m.pitchCount ?? 0) > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "#0071e3", color: "white" }}
              title={`${m.pitchCount} pitch${(m.pitchCount ?? 0) !== 1 ? "es" : ""}`}
            >
              {m.pitchCount} pitch{(m.pitchCount ?? 0) !== 1 ? "es" : ""}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Month column ─────────────────────────────────────────────────────────────

interface MonthColProps {
  month:   Date;
  moments: CalendarMoment[];
  isNow:   boolean;
  onRemove?: (id: string) => void;
}

function MonthColumn({ month, moments, isNow, onRemove }: MonthColProps) {
  const qLabel = fiscalQLabel(month);
  const label  = format(month, "MMMM yyyy");

  return (
    <div className="min-w-[220px] flex-1">
      {/* Month header */}
      <div
        className="sticky top-[52px] z-10 px-3 pt-3 pb-2 rounded-t-xl"
        style={{
          backgroundColor: isNow ? "#edf4fe" : "#f5f5f7",
          borderBottom: `1px solid ${isNow ? "rgba(0,113,227,0.20)" : "#e8e8ed"}`,
        }}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span
            className="text-[13px] font-semibold"
            style={{ color: isNow ? "#0071e3" : "#1d1d1f" }}
          >
            {label}
          </span>
          <span
            className="text-[9px] font-bold tracking-widest uppercase shrink-0"
            style={{ color: isNow ? "#0071e3" : "#86868b" }}
          >
            {qLabel}
          </span>
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: "#86868b" }}>
          {moments.length === 0
            ? "No moments"
            : `${moments.length} moment${moments.length > 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Cards */}
      <div
        className="px-2 pt-2 pb-3 flex flex-col gap-2 rounded-b-xl"
        style={{ backgroundColor: isNow ? "rgba(0,113,227,0.02)" : "transparent" }}
      >
        {moments.length === 0 ? (
          <div className="py-6 flex items-center justify-center">
            <span className="text-[11px] text-[#d2d2d7]">—</span>
          </div>
        ) : (
          moments.map(m => <MomentCard key={m.id} m={m} onRemove={onRemove} />)
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CalendarGrid({ moments, onRemove }: { moments: CalendarMoment[]; onRemove?: (id: string) => void }) {
  const { months, byMonth, nowKey } = useMemo(() => {
    const today    = new Date();
    const nowKey   = format(today, "yyyy-MM");

    // Compute visible month range from data (same padding as timeline)
    const allDates = moments.flatMap(m => [
      parseISO(m.startDate),
      parseISO(m.endDate ?? m.startDate),
    ]);
    const minDate    = allDates.length ? allDates.reduce((a, b) => (a < b ? a : b)) : subMonths(today, 1);
    const maxDate    = allDates.length ? allDates.reduce((a, b) => (a > b ? a : b)) : addMonths(today, 6);
    const rangeStart = startOfMonth(minDate);
    const rangeEnd   = endOfMonth(maxDate);

    const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });

    // Group moments by start month
    const byMonth: Record<string, CalendarMoment[]> = {};
    for (const month of months) {
      byMonth[format(month, "yyyy-MM")] = [];
    }
    for (const m of moments) {
      const key = m.startDate.slice(0, 7); // "yyyy-MM"
      if (byMonth[key]) byMonth[key].push(m);
      else byMonth[key] = [m];
    }
    // Sort each month's moments by score desc, then name
    for (const key of Object.keys(byMonth)) {
      byMonth[key].sort((a, b) => {
        const sa = a.score ?? -1;
        const sb = b.score ?? -1;
        if (sb !== sa) return sb - sa;
        return a.name.localeCompare(b.name);
      });
    }

    return { months, byMonth, nowKey };
  }, [moments]);

  // Group months into fiscal quarters for quarter-break dividers
  const quarters = useMemo(() => {
    const groups: { label: string; months: Date[] }[] = [];
    let cur: { label: string; months: Date[] } | null = null;
    for (const m of months) {
      const lbl = fiscalQLabel(m);
      if (!cur || cur.label !== lbl) {
        if (cur) groups.push(cur);
        cur = { label: lbl, months: [m] };
      } else {
        cur.months.push(m);
      }
    }
    if (cur) groups.push(cur);
    return groups;
  }, [months]);

  if (moments.length === 0) return null;

  return (
    <div>
      {quarters.map((q, qi) => (
        <div key={qi} className="mb-8">
          {/* Quarter divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-apple-gray-100" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-apple-gray-400 px-1">
              {q.label}
            </span>
            <div className="h-px flex-1 bg-apple-gray-100" />
          </div>

          {/* Month columns for this quarter */}
          <div className="flex gap-3 pb-2 items-start" style={{ overflowX: "auto", overflowY: "clip" }}>
            {q.months.map((month, mi) => {
              const key = format(month, "yyyy-MM");
              return (
                <MonthColumn
                  key={mi}
                  month={month}
                  moments={byMonth[key] ?? []}
                  isNow={key === nowKey}
                  onRemove={onRemove}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

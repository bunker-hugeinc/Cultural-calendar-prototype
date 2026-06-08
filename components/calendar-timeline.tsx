"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CATEGORY_BG, CATEGORY_TEXT, CATEGORY_BORDER } from "@/lib/category-colors";
import type { CalendarMoment } from "@/app/calendar/page";

// ─── Apple fiscal quarters ────────────────────────────────────────────────────
function fiscalQLabel(d: Date): string {
  const mo = d.getMonth();
  const yr = d.getFullYear();
  if (mo >= 9) return `Q1 FY${yr + 1}`;
  if (mo <= 2) return `Q2 FY${yr}`;
  if (mo <= 5) return `Q3 FY${yr}`;
  return `Q4 FY${yr}`;
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

// ─── EMEIA smart row-packing ───────────────────────────────────────────────────
const PX_PER_DAY = 5;
const BAR_MIN_W  = 80;
const ROW_H      = 34;
const ROW_GAP    = 5;

interface BarLayout {
  moment: CalendarMoment;
  row: number;
  leftPx: number;
  widthPx: number;
}

function layoutBars(moments: CalendarMoment[], calStart: Date): BarLayout[] {
  const layouts: BarLayout[] = [];
  const rowEnds: number[] = [];

  const sorted = [...moments].sort((a, b) => a.startDate.localeCompare(b.startDate));

  for (const moment of sorted) {
    const startD = new Date(moment.startDate + "T00:00:00");
    const endD   = moment.endDate
      ? new Date(moment.endDate + "T00:00:00")
      : new Date(startD.getTime() + 86400000);

    const startOff = Math.max(0, diffDays(startD, calStart));
    const durDays  = Math.max(1, diffDays(endD, startD));
    const leftPx   = startOff * PX_PER_DAY;
    const widthPx  = Math.max(durDays * PX_PER_DAY, BAR_MIN_W);

    let row = 0;
    while (rowEnds[row] !== undefined && rowEnds[row] > leftPx - 8) row++;
    rowEnds[row] = leftPx + widthPx;

    layouts.push({ moment, row, leftPx, widthPx });
  }
  return layouts;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function CalendarTimeline({ moments }: { moments: CalendarMoment[] }) {
  const derived = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allStarts = moments.map(m => new Date(m.startDate + "T00:00:00"));
    const allEnds   = moments.map(m => new Date((m.endDate ?? m.startDate) + "T00:00:00"));
    const minDate   = allStarts.length ? allStarts.reduce((a, b) => a < b ? a : b) : addMonths(today, -1);
    const maxDate   = allEnds.length   ? allEnds.reduce((a, b)   => a > b ? a : b) : addMonths(today, 6);

    const calStart = monthStart(addMonths(minDate, -1));
    const calEnd   = monthStart(addMonths(maxDate, 2));

    // Build month list
    const monthList: Date[] = [];
    let cur = new Date(calStart);
    while (cur < calEnd) {
      monthList.push(new Date(cur));
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }

    // Month marks (px offset from calStart)
    const monthMarks = monthList.map(m => ({
      label: m.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      leftPx: diffDays(m, calStart) * PX_PER_DAY,
    }));

    // Quarter bands
    const quarters: { label: string; leftPx: number; widthPx: number }[] = [];
    let qCur: { label: string; start: Date } | null = null;
    for (const m of monthList) {
      const lbl = fiscalQLabel(m);
      if (!qCur) { qCur = { label: lbl, start: m }; continue; }
      if (lbl !== qCur.label) {
        quarters.push({ label: qCur.label, leftPx: diffDays(qCur.start, calStart) * PX_PER_DAY, widthPx: diffDays(m, qCur.start) * PX_PER_DAY });
        qCur = { label: lbl, start: m };
      }
    }
    if (qCur) {
      quarters.push({ label: qCur.label, leftPx: diffDays(qCur.start, calStart) * PX_PER_DAY, widthPx: diffDays(calEnd, qCur.start) * PX_PER_DAY });
    }

    // Today line
    const todayPx = today >= calStart && today <= calEnd ? diffDays(today, calStart) * PX_PER_DAY : null;

    // Total canvas width
    const totalDays  = diffDays(calEnd, calStart);
    const canvasW    = totalDays * PX_PER_DAY;

    // Bar layout
    const layouts = layoutBars(moments, calStart);
    const maxRow  = layouts.length ? Math.max(...layouts.map(l => l.row)) : 0;
    const canvasH = (maxRow + 1) * (ROW_H + ROW_GAP) + 16;

    return { monthMarks, quarters, todayPx, canvasW, canvasH, layouts, calStart, today };
  }, [moments]);

  const { monthMarks, quarters, todayPx, canvasW, canvasH, layouts } = derived;

  const HEADER_H = 52;

  return (
    <div style={{ overflowX: "auto", background: "white", borderRadius: 16, border: "1px solid #e8e8ed", padding: 20 }}>
      <div style={{ minWidth: Math.max(canvasW, 600), position: "relative" }}>

        {/* ── Month + quarter header ─────────────────────────────────── */}
        <div style={{ position: "relative", height: HEADER_H, marginBottom: 8 }}>
          {/* Quarter labels */}
          {quarters.map((q, i) => (
            <div key={i} style={{ position: "absolute", left: q.leftPx, width: q.widthPx, top: 0, height: 22, overflow: "hidden", borderLeft: i > 0 ? "1px solid #f5f5f7" : undefined }}>
              <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#86868b", paddingLeft: 4 }}>
                {q.label}
              </span>
            </div>
          ))}
          {/* Month labels + grid lines */}
          {monthMarks.map((mm, i) => (
            <div key={i} style={{ position: "absolute", left: mm.leftPx, top: 26, bottom: 0 }}>
              <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 1, background: "#f5f5f7" }} />
              <span style={{ position: "absolute", top: 4, left: 4, fontSize: "0.63rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#86868b", whiteSpace: "nowrap" }}>
                {mm.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Bar canvas ────────────────────────────────────────────── */}
        <div style={{ position: "relative", height: canvasH }}>
          {/* Grid lines */}
          {monthMarks.map((mm, i) => (
            <div key={i} style={{ position: "absolute", left: mm.leftPx, top: 0, bottom: 0, width: 1, background: "#f5f5f7" }} />
          ))}

          {/* Today line */}
          {todayPx !== null && (
            <div style={{ position: "absolute", left: todayPx, top: 0, bottom: 0, width: 1.5, background: "#0071e3", zIndex: 10 }}>
              <span style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: "0.6rem", fontWeight: 700, color: "#0071e3", whiteSpace: "nowrap" }}>
                Today
              </span>
            </div>
          )}

          {/* Bars */}
          {layouts.map(({ moment: m, row, leftPx, widthPx }) => {
            const top = row * (ROW_H + ROW_GAP);
            const bg     = CATEGORY_BG[m.category]     ?? "rgba(134,134,139,0.12)";
            const color  = CATEGORY_TEXT[m.category]   ?? "#86868b";
            const border = CATEGORY_BORDER[m.category] ?? "rgba(134,134,139,0.35)";
            return (
              <Link
                key={m.id}
                href={`/moments/${m.id}`}
                title={m.name}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: leftPx,
                    top,
                    width: widthPx,
                    height: ROW_H,
                    background: bg,
                    border: `1.5px solid ${border}`,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 10,
                    paddingRight: 10,
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "opacity 0.15s",
                  }}
                >
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.name}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

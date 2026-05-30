"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// ─── FIXED START — timeline always begins Apr 1 2026 ─────────────────────────
const TL_START = new Date(2026, 3, 1);
const TL_START_MS = TL_START.getTime();

// The original end of the timeline (Jul 2027). Months beyond this are "extended".
const ORIGINAL_END = new Date(2027, 7, 1); // Aug 1 2027 exclusive

// ─── CATEGORY STYLES ─────────────────────────────────────────────────────────
const CAT = {
  gather:  { bg: "rgba(52,168,83,.1)",   bd: "rgba(52,168,83,.55)", txt: "#1a6b2e", solid: "#34a853" },
  improve: { bg: "rgba(220,80,120,.09)", bd: "rgba(220,80,120,.5)", txt: "#9c2050", solid: "#dc5078" },
  excite:  { bg: "rgba(37,99,235,.09)",  bd: "rgba(37,99,235,.48)", txt: "#1a3fa8", solid: "#2563eb" },
} as const;

// ─── LAYOUT ──────────────────────────────────────────────────────────────────
const LANE_H  = 36;
const PAD     = 10;
const BAR_H   = 24;
const MIN_BAR_PCT = 0.5;
const LABEL_INSIDE_THRESHOLD = 5.5;

// ─── FONTS ───────────────────────────────────────────────────────────────────
const MONO = `"SF Pro Mono","SFMono-Regular",ui-monospace,monospace`;
const SANS = `-apple-system,"SF Pro Text",BlinkMacSystemFont,sans-serif`;
const DISP = `"SF Pro Display",-apple-system,BlinkMacSystemFont,sans-serif`;

// ─── TYPES ───────────────────────────────────────────────────────────────────
export interface MomentData {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  category: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function makeToPct(tlMs: number) {
  return (date: Date) => Math.max(0, Math.min(100, (date.getTime() - TL_START_MS) / tlMs * 100));
}

// Minimum TL_END is Aug 1 2027 (original). Extends if any moment goes further.
function computeTlEnd(moments: MomentData[]): Date {
  let max = new Date(2027, 6, 31); // Jul 31 2027
  for (const m of moments) {
    const d = parseDate(m.endDate ?? m.startDate);
    if (d > max) max = d;
  }
  // Snap forward to first day of month + 1 month breathing room
  return new Date(max.getFullYear(), max.getMonth() + 2, 1);
}

function buildMonths(tlEnd: Date): Date[] {
  const months: Date[] = [];
  let cur = new Date(TL_START);
  while (cur < tlEnd) {
    months.push(new Date(cur));
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return months;
}

function buildYearGroups(months: Date[]): { year: number; count: number }[] {
  const groups: { year: number; count: number }[] = [];
  for (const m of months) {
    const y = m.getFullYear();
    if (!groups.length || groups[groups.length - 1].year !== y) {
      groups.push({ year: y, count: 1 });
    } else {
      groups[groups.length - 1].count++;
    }
  }
  return groups;
}

// Apple Fiscal Year: Q1=Oct–Dec, Q2=Jan–Mar, Q3=Apr–Jun, Q4=Jul–Sep
function appleFY(date: Date): { fy: number; q: number } {
  const y = date.getFullYear();
  const m = date.getMonth();
  if (m >= 9) return { fy: y + 1, q: 1 }; // Oct–Dec
  if (m <= 2)  return { fy: y,     q: 2 }; // Jan–Mar
  if (m <= 5)  return { fy: y,     q: 3 }; // Apr–Jun
  return         { fy: y,     q: 4 };       // Jul–Sep
}

function buildQuarters(tlEnd: Date) {
  const MNAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const Q_CLS = ["","q1","q2","q3","q4"] as const;
  const result: { label: string; months: number; cls: string; extended: boolean }[] = [];

  let cur = new Date(TL_START);
  while (cur < tlEnd) {
    // Quarter ends at start of next calendar quarter (Jan/Apr/Jul/Oct)
    const qStartMonth = Math.floor(cur.getMonth() / 3) * 3;
    const qEnd = new Date(cur.getFullYear(), qStartMonth + 3, 1);
    const segEnd = qEnd < tlEnd ? qEnd : tlEnd;

    const { fy, q } = appleFY(cur);

    let months = 0;
    let m = new Date(cur);
    while (m < segEnd) { months++; m = new Date(m.getFullYear(), m.getMonth() + 1, 1); }

    const startName = MNAMES[cur.getMonth()];
    const endM = new Date(segEnd.getFullYear(), segEnd.getMonth() - 1, 1);
    const endName = MNAMES[endM.getMonth()];
    const label = months >= 2 ? `Q${q} ${fy} · ${startName}–${endName}` : `Q${q}`;

    result.push({ label, months, cls: Q_CLS[q], extended: cur >= ORIGINAL_END });
    cur = segEnd;
  }
  return result;
}

// ─── LANE PACKING ────────────────────────────────────────────────────────────
function packLanes(moments: MomentData[]): Map<string, number> {
  const sorted = [...moments].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const laneEnds: Date[] = [];
  const assignments = new Map<string, number>();

  for (const m of sorted) {
    const start = parseDate(m.startDate);
    const endD  = parseDate(m.endDate ?? m.startDate);
    const until = new Date(endD.getTime() + 86400000);

    let placed = false;
    for (let i = 0; i < laneEnds.length; i++) {
      if (laneEnds[i] <= start) { laneEnds[i] = until; assignments.set(m.id, i); placed = true; break; }
    }
    if (!placed) { assignments.set(m.id, laneEnds.length); laneEnds.push(until); }
  }
  return assignments;
}

// ─── TODAY MARKER ────────────────────────────────────────────────────────────
// Separate component to avoid SSR/hydration mismatch with new Date()
function _TodayLine({ tlStartMs, tlMs }: { tlStartMs: number; tlMs: number }) {
  const [pct, setPct] = useState<number | null>(null);
  useEffect(() => {
    const t = Date.now();
    if (t > tlStartMs && t < tlStartMs + tlMs) {
      setPct((t - tlStartMs) / tlMs * 100);
    }
  }, [tlStartMs, tlMs]);
  if (pct === null) return null;
  return (
    <div
      style={{ left: `${pct}%` }}
      className="absolute top-0 bottom-0 w-0.5 bg-red-400/70 z-10 pointer-events-none"
    />
  );
}
const TodayMarker = dynamic(() => Promise.resolve(_TodayLine), { ssr: false });

// ─── QUARTER CELL STYLE ──────────────────────────────────────────────────────
function qCellStyle(cls: string, first: boolean, extended: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: MONO, fontSize: 8, fontWeight: 500, letterSpacing: ".16em",
    textTransform: "uppercase", padding: "5px 0 4px 8px",
    borderLeft: first ? "none" : "1px solid rgba(0,0,0,.055)",
    overflow: "hidden", whiteSpace: "nowrap",
    opacity: extended ? 0.65 : 1,
  };
  if (cls === "q3") return { ...base, color: "#1a6b2e", background: extended ? "rgba(52,168,83,.03)"  : "rgba(52,168,83,.06)" };
  if (cls === "q4") return { ...base, color: "#9c2050", background: extended ? "rgba(220,80,120,.03)" : "rgba(220,80,120,.06)" };
  if (cls === "q1") return { ...base, color: "#6e6e80", background: "rgba(0,0,0,.02)" };
  if (cls === "q2") return { ...base, color: "#1a3fa8", background: extended ? "rgba(37,99,235,.02)"  : "rgba(37,99,235,.05)" };
  return base;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export function GanttChart({ moments }: { moments: MomentData[] }) {
  const [filter, setFilter] = useState<"all" | "gather" | "improve" | "excite">("all");

  const tlEnd       = computeTlEnd(moments);
  const tlMs        = tlEnd.getTime() - TL_START_MS;
  const toPct       = makeToPct(tlMs);
  const allMonths   = buildMonths(tlEnd);
  const yearGroups  = buildYearGroups(allMonths);
  const quarters    = buildQuarters(tlEnd);
  const totalMonths = allMonths.length;

  const laneAssignments = packLanes(moments);
  const laneCount = Math.max(0, ...Array.from(laneAssignments.values())) + 1;
  const canvasH   = laneCount * LANE_H + PAD * 2;

  const MNAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Jan 2027 = index 9 in original 16-month run. In extended view it's still index 9.
  const jan2027Idx = allMonths.findIndex(m => m.getFullYear() === 2027 && m.getMonth() === 0);

  return (
    <>
      <style>{`
        .gantt-bar { transition: filter .12s, transform .1s; }
        .gantt-bar:hover { filter: brightness(.82); transform: translateY(-1px); }
        .gantt-filter-btn:hover { background: #f5f5f7 !important; color: #111 !important; }
      `}</style>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22, gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase", color: "#b0b0ba", marginBottom: 4 }}>
            Apple Pay · Partner Marketing
          </div>
          <div style={{ fontFamily: DISP, fontSize: 38, fontWeight: 800, letterSpacing: "-.01em", color: "#111", lineHeight: 1 }}>
            Annual Calendar at-a-glance
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: "#6e6e80", marginTop: 7 }}>
            {moments.length} moments · Apr 2026 – {totalMonths > 16 ? `${MNAMES[tlEnd.getMonth() - 1] ?? "Jul"} ${tlEnd.getFullYear() - (tlEnd.getMonth() === 0 ? 1 : 0)}` : "Jul 2027"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          {/* Filter pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {(["all", "gather", "improve", "excite"] as const).map((f) => {
              const active = filter === f;
              return (
                <button key={f} onClick={() => setFilter(f)}
                  className={active ? "" : "gantt-filter-btn"}
                  style={{ fontFamily: MONO, fontSize: 8, fontWeight: 500, letterSpacing: ".14em", textTransform: "uppercase", padding: "5px 12px", borderRadius: 20, border: `1px solid ${active ? "#111" : "rgba(0,0,0,.1)"}`, background: active ? "#111" : "#fff", color: active ? "#fff" : "#6e6e80", cursor: "pointer", transition: "all .15s" }}>
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              );
            })}
          </div>
          {/* Legend */}
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            {(["gather", "improve", "excite"] as const).map((cat) => (
              <div key={cat} style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 9, fontWeight: 500, letterSpacing: ".14em", textTransform: "uppercase", color: "#6e6e80" }}>
                <div style={{ width: 22, height: 3, borderRadius: 2, background: CAT[cat].solid, flexShrink: 0 }} />
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,.1)", borderRadius: 12, overflow: "hidden" }}>

        {/* Sticky axis */}
        <div style={{ borderBottom: "1px solid rgba(0,0,0,.1)", background: "#f5f5f7", position: "sticky", top: 0, zIndex: 30 }}>

          {/* Quarter row */}
          <div style={{ display: "grid", gridTemplateColumns: quarters.map(q => `${q.months}fr`).join(" "), borderBottom: "1px solid rgba(0,0,0,.055)" }}>
            {quarters.map((q, i) => (
              <div key={i} style={qCellStyle(q.cls, i === 0, q.extended)}>{q.label}</div>
            ))}
          </div>

          {/* Year row */}
          <div style={{ display: "grid", gridTemplateColumns: yearGroups.map(g => `${g.count}fr`).join(" "), borderBottom: "1px solid rgba(0,0,0,.055)" }}>
            {yearGroups.map((g, i) => (
              <div key={g.year} style={{ fontFamily: DISP, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "#b0b0ba", padding: "4px 0 3px 8px", borderLeft: i === 0 ? "none" : "1px solid rgba(0,0,0,.055)" }}>
                {g.year}
              </div>
            ))}
          </div>

          {/* Month row */}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${totalMonths},1fr)` }}>
            {allMonths.map((m, i) => {
              const extended = m >= ORIGINAL_END;
              const isYearBoundary = i === jan2027Idx;
              return (
                <div key={i} style={{
                  fontFamily: MONO, fontSize: 7.5, fontWeight: 500, letterSpacing: ".14em", textTransform: "uppercase",
                  color: isYearBoundary ? "#6e6e80" : "#b0b0ba",
                  padding: "5px 0 4px 5px",
                  borderLeft: i === 0 ? "none" : isYearBoundary ? "1.5px solid rgba(0,0,0,.18)" : extended ? "1px dashed rgba(0,0,0,.1)" : "1px solid rgba(0,0,0,.055)",
                  opacity: extended ? 0.65 : 1,
                }}>
                  {MNAMES[m.getMonth()].toUpperCase().slice(0, 3)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Canvas */}
        <div style={{ position: "relative", height: canvasH }}>

          {/* Gridlines */}
          <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: `repeat(${totalMonths},1fr)`, pointerEvents: "none", zIndex: 0 }}>
            {allMonths.map((m, i) => {
              const extended = m >= ORIGINAL_END;
              const isYearBoundary = i === jan2027Idx;
              return (
                <div key={i} style={{
                  borderLeft: i === 0 ? "none"
                    : isYearBoundary ? "1.5px solid rgba(0,0,0,.13)"
                    : extended ? "1px dashed rgba(0,0,0,.07)"
                    : "1px solid rgba(0,0,0,.055)",
                }} />
              );
            })}
          </div>

          {/* Today marker */}
          <TodayMarker tlStartMs={TL_START_MS} tlMs={tlMs} />

          {/* Bars */}
          {moments.map((m) => {
            const lane   = laneAssignments.get(m.id) ?? 0;
            const start  = parseDate(m.startDate);
            const end    = parseDate(m.endDate ?? m.startDate);
            const endEx  = new Date(end.getTime() + 86400000);

            const leftPct  = toPct(start);
            const widthPct = Math.max(MIN_BAR_PCT, toPct(endEx) - leftPct);
            const styles   = CAT[m.category as keyof typeof CAT] ?? CAT.gather;
            const active   = filter === "all" || filter === m.category;
            const labelIn  = widthPct >= LABEL_INSIDE_THRESHOLD;
            const top      = PAD + lane * LANE_H;

            return (
              <div key={m.id} style={{ position: "absolute", left: `${leftPct}%`, width: `${widthPct}%`, top, height: BAR_H, opacity: active ? 1 : 0.25, transition: "opacity .2s", zIndex: 2 }}>
                <Link href={`/moments/${m.id}`} title={m.name} className="gantt-bar"
                  style={{ display: "flex", alignItems: "center", overflow: "hidden", width: "100%", height: "100%", borderRadius: 4, background: styles.bg, border: `1.5px solid ${styles.bd}`, cursor: "pointer", textDecoration: "none", pointerEvents: active ? "auto" : "none" }}>
                  {labelIn && (
                    <span style={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 600, color: styles.txt, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "0 5px", flex: 1, minWidth: 0, lineHeight: 1.2, pointerEvents: "none" }}>
                      {m.name}
                    </span>
                  )}
                </Link>
                {!labelIn && active && (
                  <span style={{ position: "absolute", left: "calc(100% + 5px)", top: 1, fontFamily: SANS, fontSize: 9, fontWeight: 600, color: styles.txt, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 3, lineHeight: 1 }}>
                    {m.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

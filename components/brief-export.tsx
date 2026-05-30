"use client";

import { useState } from "react";

const MONO = `"SF Pro Mono","SFMono-Regular",ui-monospace,monospace`;

interface BriefPairing {
  merchantName: string;
  merchantCategory: string;
  relevanceScore: number;
  campaignAngle: string;
  rationale: string | null;
}

interface BriefData {
  moment: {
    name: string;
    startDate: string;
    endDate: string | null;
    category: string;
    description: string;
    hook: string | null;
    score: number | null;
  };
  pairings: BriefPairing[];
  generatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function formatDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function dateRange(start: string, end: string | null) {
  if (!end || end === start) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

const CAT_COLOR: Record<string, [number, number, number]> = {
  gather:  [52,  168,  83],
  improve: [220,  80, 120],
  excite:  [37,   99, 235],
};

function catRGB(category: string): [number, number, number] {
  return CAT_COLOR[category] ?? [100, 100, 100];
}

function scoreColor(score: number): [number, number, number] {
  if (score >= 7) return [22, 163, 74];
  if (score >= 4) return [217, 119, 6];
  return [220, 38, 38];
}

// ─── PDF builder ─────────────────────────────────────────────────────────────
async function buildPDF(data: BriefData): Promise<void> {
  // Dynamic import so jsPDF only loads client-side
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210; // A4 width mm
  const ML = 20; // left margin
  const MR = 20; // right margin
  const CONTENT_W = W - ML - MR; // 170mm
  const COL_L = CONTENT_W * 0.58; // ~98.6mm
  const COL_R_X = ML + COL_L + 6; // right col x
  const COL_R_W = CONTENT_W - COL_L - 6; // ~65.4mm
  const [cr, cg, cb] = catRGB(data.moment.category);

  let y = 18; // current y cursor

  // ── HEADER ────────────────────────────────────────────────────────────────
  // Eyebrow
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 170);
  doc.text("APPLE PAY PARTNER MARKETING  ·  CAMPAIGN BRIEF", ML, y);
  y += 7;

  // Moment name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(17, 17, 17);
  doc.text(data.moment.name, ML, y);
  y += 9;

  // Date + category
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(110, 110, 128);
  const catLabel = data.moment.category.charAt(0).toUpperCase() + data.moment.category.slice(1);
  doc.text(`${dateRange(data.moment.startDate, data.moment.endDate)}   ·   ${catLabel}`, ML, y);
  y += 6;

  // Category accent bar
  doc.setFillColor(cr, cg, cb);
  doc.rect(ML, y, CONTENT_W, 1.2, "F");
  y += 6;

  // ── BODY (two-column) ─────────────────────────────────────────────────────
  const bodyY = y;
  let ly = bodyY; // left col cursor
  let ry = bodyY; // right col cursor

  // ── LEFT COL ─────────────────────────────────────────────────────────────
  // Section label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 170);
  doc.text("CAMPAIGN CONTEXT", ML, ly);
  ly += 5;

  // Description
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(44, 44, 54);
  const descLines = doc.splitTextToSize(data.moment.description, COL_L);
  doc.text(descLines, ML, ly);
  ly += descLines.length * 5 + 4;

  // Hook pills
  if (data.moment.hook) {
    const hooks = data.moment.hook.split(",").map(h => h.trim()).filter(Boolean);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 128);
    doc.text("HOOK TYPE", ML, ly);
    ly += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 70);
    doc.text(hooks.join("  ·  "), ML, ly);
    ly += 8;
  }

  // Apple Pay angle (top pairing)
  if (data.pairings.length > 0) {
    const top = data.pairings[0];
    ly += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 170);
    doc.text("APPLE PAY ANGLE", ML, ly);
    ly += 5;

    // Pull-quote accent line
    doc.setFillColor(cr, cg, cb);
    doc.rect(ML, ly - 3.5, 2.5, 12, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(cr, cg, cb);
    const angleLines = doc.splitTextToSize(top.campaignAngle, COL_L - 6);
    doc.text(angleLines, ML + 6, ly);
    ly += angleLines.length * 6.5 + 2;

    if (top.rationale) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(110, 110, 128);
      const ratLines = doc.splitTextToSize(top.rationale, COL_L);
      doc.text(ratLines, ML, ly);
      ly += ratLines.length * 5;
    }
  }

  // ── RIGHT COL ─────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 170);
  doc.text("TOP MERCHANT PAIRINGS", COL_R_X, ry);
  ry += 5;

  for (const p of data.pairings) {
    // Merchant name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(17, 17, 17);
    doc.text(p.merchantName, COL_R_X, ry);
    ry += 4;

    // Score bar background
    const barW = COL_R_W;
    const barH = 3;
    doc.setFillColor(230, 230, 235);
    doc.rect(COL_R_X, ry, barW, barH, "F");
    // Score fill
    const [sr, sg, sb] = scoreColor(p.relevanceScore);
    const fillW = (p.relevanceScore / 10) * barW;
    doc.setFillColor(sr, sg, sb);
    doc.rect(COL_R_X, ry, fillW, barH, "F");
    // Score label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(sr, sg, sb);
    doc.text(`${p.relevanceScore}/10`, COL_R_X + barW + 1.5, ry + 2.5);
    ry += barH + 3;

    // Campaign angle
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(110, 110, 128);
    const aLines = doc.splitTextToSize(p.campaignAngle, COL_R_W);
    doc.text(aLines.slice(0, 2), COL_R_X, ry); // max 2 lines
    ry += Math.min(aLines.length, 2) * 4.2 + 2;

    // Separator
    doc.setDrawColor(220, 220, 225);
    doc.setLineWidth(0.3);
    doc.line(COL_R_X, ry, COL_R_X + COL_R_W, ry);
    ry += 4;
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const footerY = 282;
  doc.setFillColor(245, 245, 247);
  doc.rect(0, footerY - 4, W, 14, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 170);
  doc.text("Generated by Cultural Calendar · Apple Pay Partner Marketing", ML, footerY);
  const genDate = new Date(data.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  doc.text(genDate, W - MR, footerY, { align: "right" });

  // Download
  doc.save(`${slugify(data.moment.name)}-brief.pdf`);
}

// ─── Component ───────────────────────────────────────────────────────────────
export function BriefExport({ momentId }: { momentId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/moments/${momentId}/brief`);
      if (!res.ok) return;
      const data: BriefData = await res.json();
      await buildPDF(data);
    } catch (e) {
      console.error("Brief generation failed", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="shrink-0 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
      style={{
        fontFamily: MONO,
        fontSize: 11,
        letterSpacing: ".05em",
        cursor: loading ? "default" : "pointer",
        opacity: loading ? 0.7 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
      }}
    >
      {loading ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ animation: "spin .8s linear infinite" }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          Generating…
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          Generate Brief
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}

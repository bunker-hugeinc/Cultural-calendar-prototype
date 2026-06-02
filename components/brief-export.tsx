"use client";

import { useState } from "react";

const MONO = `"SF Pro Mono","SFMono-Regular",ui-monospace,monospace`;

// ─── Types ───────────────────────────────────────────────────────────────────

interface BriefPairing {
  merchantName: string;
  merchantCategory: string;
  relevanceScore: number;
  campaignAngle: string;
  rationale: string | null;
}

interface BriefContent {
  toplineOverview: string;
  businessObjectives: string[];
  audience: string;
  deliverables: string[];
  successMetrics: string[];
  timingNotes: string;
  foundationalInsights: string;
  messagingHierarchy: string[];
  creativeTacticalConsiderations: string[];
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
    quarter?: string | null;
  };
  pairings: BriefPairing[];
  briefContent: BriefContent;
  campaignName: string | null;
  targetQuarter: string | null;
  inspirationUrls: string[];
  generatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function scoreColor(score: number): [number, number, number] {
  if (score >= 7) return [22, 163, 74];
  if (score >= 4) return [217, 119, 6];
  return [220, 38, 38];
}

// ─── PDF builder ─────────────────────────────────────────────────────────────

async function buildPDF(data: BriefData): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 20;
  const pageW = 210;
  const contentW = pageW - margin * 2;
  let y = margin;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const nl = (extra = 0) => { y += 5 + extra; };

  const checkPage = () => {
    if (y > 265) {
      doc.addPage();
      y = margin;
    }
  };

  const sectionHeader = (label: string) => {
    checkPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(label, margin, y);
    nl();
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y);
    nl(2);
  };

  const promptLabel = (text: string) => {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const lines = doc.splitTextToSize(text, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 3;
  };

  const bodyText = (text: string) => {
    checkPage();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(text, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 2;
  };

  const bulletList = (items: string[]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    items.forEach(item => {
      checkPage();
      doc.text("–", margin + 2, y);
      const lines = doc.splitTextToSize(item, contentW - 8);
      doc.text(lines, margin + 8, y);
      y += lines.length * 5 + 1;
    });
    y += 2;
  };

  // ── PAGE 1: Header ────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Apple Pay", margin, y);

  const quarterLabel = data.targetQuarter ?? data.moment.quarter ?? "FY";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(`${quarterLabel} Acquisition Marketing Brief`, pageW - margin, y, { align: "right" });
  nl();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  const catCap = data.moment.category.charAt(0).toUpperCase() + data.moment.category.slice(1);
  doc.text(`Partner Marketing — ${catCap}`, pageW - margin, y, { align: "right" });

  y += 8;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineWidth(0.2);
  y += 8;

  // Moment name subtitle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text(data.campaignName ?? data.moment.name, margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 130);
  doc.text(`Moment: ${data.moment.name}`, margin, y);
  y += 10;

  // ── SECTION 1: Topline Overview ───────────────────────────────────────────
  sectionHeader("Topline Overview");
  promptLabel("What are we doing? A quick snapshot of the assignment (2–3 sentences). Think of it as your TL;DR.");
  bodyText(data.briefContent.toplineOverview);
  nl(2);

  // ── Business Objectives ───────────────────────────────────────────────────
  sectionHeader("Business Objectives");
  promptLabel("What business problem are we trying to solve? A brief overview of the 'why' for this initiative.");
  bulletList(data.briefContent.businessObjectives);
  nl(2);

  // ── Audience ──────────────────────────────────────────────────────────────
  sectionHeader("Audience");
  promptLabel("Who are we talking to? If more than one audience, note which is primary.");
  bodyText(data.briefContent.audience);
  nl(2);

  // ── Deliverables ──────────────────────────────────────────────────────────
  sectionHeader("Deliverables");
  promptLabel("What's being created, exactly? Use a bulleted list.");
  bulletList(data.briefContent.deliverables);
  nl(2);

  // ── Success Metrics ───────────────────────────────────────────────────────
  sectionHeader("Success Metrics");
  promptLabel("How will we know this worked? List the KPIs that matter most (no more than 2–3).");
  bulletList(data.briefContent.successMetrics);
  nl(2);

  // ── Timing & Approvals ────────────────────────────────────────────────────
  sectionHeader("Timing & Approvals");
  promptLabel("When is the desired complete date? What's driving it? Who needs to approve it?");
  bodyText(data.briefContent.timingNotes);
  if (data.targetQuarter) {
    bodyText(`Target Quarter: ${data.targetQuarter}`);
  }
  bodyText("Approvers include Partner Marketing, WW Legal, Privacy and Security Council, and Marcom.");
  nl(2);

  // ── Additional References ─────────────────────────────────────────────────
  sectionHeader("Additional References");
  promptLabel("List and/or link to any additional documents or reference materials.");
  if (data.inspirationUrls?.length) {
    bulletList(data.inspirationUrls);
  } else {
    bodyText("—");
  }

  // ── PAGE 2: Section 2 ─────────────────────────────────────────────────────
  doc.addPage();
  y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Section 2 : Content and message detail", margin, y);
  nl();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Prompts specific to the type of initiative, to help make brief-writing easier.", margin, y);
  nl();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`Initiative type: Partner Marketing — ${data.moment.name}`, margin, y);
  y += 10;

  // ── Foundational Insights ─────────────────────────────────────────────────
  sectionHeader("Foundational Insights");
  promptLabel("Please list any foundational insights relevant to understanding the target audience (mindset, behaviors, competitive landscape).");
  bodyText(data.briefContent.foundationalInsights);
  nl(2);

  // ── Key Messages ──────────────────────────────────────────────────────────
  sectionHeader("Key Message(s) and Outcomes");
  promptLabel("What are we saying? Outline the messaging hierarchy for this work. For best results, avoid executional prescriptiveness.");
  bulletList(data.briefContent.messagingHierarchy);
  nl(2);

  // ── Creative / Tactical Considerations ───────────────────────────────────
  sectionHeader("Creative or Tactical Considerations");
  promptLabel("List any must-haves, watch-outs, or reference toolkits. Avoid being too prescriptive.");
  bulletList(data.briefContent.creativeTacticalConsiderations);
  nl(4);

  // ── Top Merchant Pairings ─────────────────────────────────────────────────
  sectionHeader("Top Merchant Pairings");
  for (const p of data.pairings) {
    checkPage();
    // Merchant name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(17, 17, 17);
    doc.text(p.merchantName, margin, y);
    y += 4;

    // Score bar
    const barMaxW = 60;
    const barH = 3;
    doc.setFillColor(230, 230, 235);
    doc.rect(margin, y, barMaxW, barH, "F");
    const [sr, sg, sb] = scoreColor(p.relevanceScore);
    const fillW = (p.relevanceScore / 10) * barMaxW;
    doc.setFillColor(sr, sg, sb);
    doc.rect(margin, y, fillW, barH, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(sr, sg, sb);
    doc.text(`${p.relevanceScore}/10`, margin + barMaxW + 2, y + 2.5);
    y += barH + 3;

    // Campaign angle
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 110);
    const angleLines = doc.splitTextToSize(p.campaignAngle, contentW - 20);
    doc.text(angleLines, margin, y);
    y += angleLines.length * 4.5 + 3;
  }

  // ── Footer on every page ──────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  const genDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(
      `Generated by Cultural Calendar · Apple Pay Partner Marketing · ${genDate}`,
      margin,
      290
    );
    doc.text(`${i} / ${pageCount}`, pageW - margin, 290, { align: "right" });
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const slug = slugify(data.moment.name);
  const quarter = (data.targetQuarter ?? data.moment.quarter ?? "brief").replace(/\s/g, "");
  doc.save(`${slug}-${quarter}-brief.pdf`);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BriefExport({ momentId }: { momentId: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [toast, setToast] = useState(false);

  async function handleGenerate() {
    setStatus("loading");
    try {
      const res = await fetch(`/api/moments/${momentId}/brief`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Brief API error:", err);
        setStatus("idle");
        return;
      }
      const data: BriefData = await res.json();
      await buildPDF(data);
      setStatus("done");
      setToast(true);
      setTimeout(() => { setToast(false); setStatus("idle"); }, 3000);
    } catch (e) {
      console.error("Brief generation failed", e);
      setStatus("idle");
    }
  }

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={status === "loading"}
        className="shrink-0 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        style={{
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: ".05em",
          cursor: status === "loading" ? "default" : "pointer",
          opacity: status === "loading" ? 0.7 : 1,
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          background: status === "done" ? "rgba(22,163,74,.08)" : undefined,
          borderColor: status === "done" ? "rgba(22,163,74,.4)" : undefined,
          color: status === "done" ? "#15803d" : undefined,
        }}
      >
        {status === "loading" ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ animation: "spin .8s linear infinite" }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            Generating Brief…
          </>
        ) : status === "done" ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Brief Downloaded ✓
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

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
          background: "#15803d", color: "#fff", padding: "10px 18px", borderRadius: 8,
          fontFamily: MONO, fontSize: 12, fontWeight: 500, zIndex: 200,
          boxShadow: "0 4px 20px rgba(0,0,0,.2)", whiteSpace: "nowrap",
        }}>
          Brief downloaded ✓
        </div>
      )}
    </>
  );
}

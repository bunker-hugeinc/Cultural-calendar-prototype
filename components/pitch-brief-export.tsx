"use client";

import { useState } from "react";

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

interface PitchBriefData {
  pitch: {
    title: string; type: string; status: string;
    situation: string | null; campaignConcept: string | null;
    campaignHeadline: string | null; keyMessages: string[];
    channelStrategy: unknown[]; influencerStrategy: unknown[];
    nextSteps: string | null; targetQuarter: string | null;
  };
  moments: { name: string; startDate: string; endDate: string | null; category: string; score: number | null; ecommerceScore: number | null; audienceFit: number | null; whiteSpaceScore: number | null }[];
  merchants: { name: string; category: string; partnerGroup: string | null }[];
  pairings: { merchantName: string; relevanceScore: number; campaignAngle: string }[];
  briefContent: BriefContent;
  generatedAt: string;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function scoreColor(score: number): [number, number, number] {
  if (score >= 7) return [22, 163, 74];
  if (score >= 4) return [217, 119, 6];
  return [220, 38, 38];
}

async function buildPitchPDF(data: PitchBriefData): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 20;
  const pageW = 210;
  const contentW = pageW - margin * 2;
  let y = margin;

  const nl = (extra = 0) => { y += 5 + extra; };

  const checkPage = () => {
    if (y > 265) { doc.addPage(); y = margin; }
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

  const bc = data.briefContent;
  const primaryMoment = data.moments[0];
  const primaryMerchant = data.merchants[0];
  const quarter = data.pitch.targetQuarter ?? "FY";
  const campaignTitle = data.pitch.campaignHeadline ?? data.pitch.title;

  // ── PAGE 1: Header ──────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Apple Pay", margin, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(`${quarter} Partner Marketing Brief`, pageW - margin, y, { align: "right" });
  nl();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  const typeLabel = data.pitch.type === "moment_led" ? "Moment-Led" : "Merchant-Led";
  doc.text(`${typeLabel} — ${primaryMerchant?.name ?? ""}`, pageW - margin, y, { align: "right" });

  y += 8;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineWidth(0.2);
  y += 8;

  // Campaign title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text(campaignTitle, margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 130);
  const subLine = [
    primaryMoment ? `Moment: ${primaryMoment.name}` : null,
    primaryMerchant ? `Partner: ${primaryMerchant.name}` : null,
  ].filter(Boolean).join("  ·  ");
  doc.text(subLine, margin, y);
  y += 10;

  // ── Section 1 fields ────────────────────────────────────────────────────────
  sectionHeader("Topline Overview");
  promptLabel("What are we doing? A quick snapshot of the assignment (2–3 sentences).");
  bodyText(bc.toplineOverview);
  nl(2);

  sectionHeader("Business Objectives");
  promptLabel("What business problem are we trying to solve?");
  bulletList(bc.businessObjectives);
  nl(2);

  sectionHeader("Audience");
  promptLabel("Who are we talking to? If more than one audience, note which is primary.");
  bodyText(bc.audience);
  nl(2);

  sectionHeader("Deliverables");
  promptLabel("What's being created, exactly?");
  bulletList(bc.deliverables);
  nl(2);

  sectionHeader("Success Metrics");
  promptLabel("How will we know this worked? List the KPIs that matter most (no more than 2–3).");
  bulletList(bc.successMetrics);
  nl(2);

  sectionHeader("Timing & Approvals");
  promptLabel("When is the desired complete date? What's driving it?");
  bodyText(bc.timingNotes);
  if (data.pitch.targetQuarter) bodyText(`Target Quarter: ${data.pitch.targetQuarter}`);
  bodyText("Approvers include Partner Marketing, WW Legal, Privacy and Security Council, and Marcom.");
  nl(2);

  sectionHeader("Additional References");
  promptLabel("List any additional documents or reference materials.");
  if (data.pitch.nextSteps) {
    bodyText(data.pitch.nextSteps);
  } else {
    bodyText("—");
  }

  // ── PAGE 2: Section 2 ───────────────────────────────────────────────────────
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
  doc.text(`Initiative type: Partner Marketing — ${data.pitch.title}`, margin, y);
  y += 10;

  sectionHeader("Foundational Insights");
  promptLabel("List any foundational insights relevant to understanding the target audience.");
  bodyText(bc.foundationalInsights);
  nl(2);

  sectionHeader("Key Message(s) and Outcomes");
  promptLabel("What are we saying? Outline the messaging hierarchy for this work.");
  bulletList(bc.messagingHierarchy);
  nl(2);

  sectionHeader("Creative or Tactical Considerations");
  promptLabel("List any must-haves, watch-outs, or reference toolkits.");
  bulletList(bc.creativeTacticalConsiderations);
  nl(4);

  // ── Top Merchant Pairings ────────────────────────────────────────────────────
  if (data.pairings.length > 0) {
    sectionHeader("Top Merchant Pairings");
    for (const p of data.pairings) {
      checkPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(17, 17, 17);
      doc.text(p.merchantName, margin, y);
      y += 4;

      const barMaxW = 60;
      const barH = 3;
      doc.setFillColor(230, 230, 235);
      doc.rect(margin, y, barMaxW, barH, "F");
      const [sr, sg, sb] = scoreColor(p.relevanceScore);
      doc.setFillColor(sr, sg, sb);
      doc.rect(margin, y, (p.relevanceScore / 10) * barMaxW, barH, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(sr, sg, sb);
      doc.text(`${p.relevanceScore}/10`, margin + barMaxW + 2, y + 2.5);
      y += barH + 3;

      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 110);
      const angleLines = doc.splitTextToSize(p.campaignAngle, contentW - 20);
      doc.text(angleLines, margin, y);
      y += angleLines.length * 4.5 + 5;
    }
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  const genDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(`Generated by Cultural Calendar · Apple Pay Partner Marketing · ${genDate}`, margin, 290);
    doc.text(`${i} / ${pageCount}`, pageW - margin, 290, { align: "right" });
  }

  const slug = slugify(data.pitch.title);
  const qSlug = (data.pitch.targetQuarter ?? "brief").replace(/\s/g, "");
  doc.save(`${slug}-${qSlug}-brief.pdf`);
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PitchBriefExport({ pitchId }: { pitchId: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [toast, setToast] = useState(false);

  async function handleBrief() {
    setStatus("loading");
    try {
      const res = await fetch(`/api/pitches/${pitchId}/brief`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Pitch brief API error:", err);
        setStatus("idle");
        return;
      }
      const data: PitchBriefData = await res.json();
      await buildPitchPDF(data);
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
        onClick={handleBrief}
        disabled={status === "loading"}
        className="btn btn-outline"
        style={{
          width: "100%", justifyContent: "center", fontSize: "0.82rem",
          opacity: status === "loading" ? 0.6 : 1,
          background: status === "done" ? "rgba(52,199,89,0.08)" : undefined,
          borderColor: status === "done" ? "rgba(52,199,89,0.4)" : undefined,
          color: status === "done" ? "#248a3d" : undefined,
          display: "inline-flex", alignItems: "center", gap: 7,
        }}
      >
        {status === "loading" && <span className="spinner" />}
        {status === "loading" ? (
          "Generating brief…"
        ) : status === "done" ? (
          "✓ Brief Downloaded"
        ) : (
          "Download Brief"
        )}
      </button>

      {toast && (
        <div style={{
          position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
          background: "#248a3d", color: "white", padding: "10px 18px",
          borderRadius: 8, fontSize: "0.85rem", fontWeight: 500, zIndex: 200,
          boxShadow: "0 4px 20px rgba(0,0,0,.2)", whiteSpace: "nowrap",
        }}>
          Brief downloaded ✓
        </div>
      )}
    </>
  );
}

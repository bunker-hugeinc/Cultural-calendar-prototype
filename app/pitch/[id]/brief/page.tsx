"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import jsPDF from "jspdf";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BriefData {
  id: string;
  pitchId: string | null;
  momentId: string | null;
  merchantId: string | null;
  toplineOverview: string | null;
  businessObjectives: string | null;
  targetAudience: string | null;
  messagingHierarchy: string | null;
  creativeTacticalConsiderations: string | null;
  deliverables: string | null;
  successMetrics: string | null;
  timingNotes: string | null;
  foundationalInsights: string | null;
  status: string | null;
  lastAutoSavedAt: string | null;
  [key: string]: string | null | undefined;
}

const BRIEF_STAGES = [
  "Reading campaign context…",
  "Defining creative objectives…",
  "Building messaging hierarchy…",
  "Drafting tactical considerations…",
  "Finalizing brief…",
];

const SECTIONS: { label: string; field: keyof BriefData }[] = [
  { label: "Top-line Overview",               field: "toplineOverview" },
  { label: "Business Objectives",             field: "businessObjectives" },
  { label: "Target Audience",                 field: "targetAudience" },
  { label: "Foundational Insights",           field: "foundationalInsights" },
  { label: "Messaging Hierarchy",             field: "messagingHierarchy" },
  { label: "Creative & Tactical Considerations", field: "creativeTacticalConsiderations" },
  { label: "Deliverables",                    field: "deliverables" },
  { label: "Success Metrics",                 field: "successMetrics" },
  { label: "Timing Notes",                    field: "timingNotes" },
];

function ProgressMessage() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setStage(prev => (prev + 1) % BRIEF_STAGES.length), 3000);
    return () => clearInterval(interval);
  }, []);
  return <p className="text-sm text-gray-500">{BRIEF_STAGES[stage]}</p>;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BriefPage() {
  const { id: pitchId } = useParams<{ id: string }>();

  const [brief, setBrief] = useState<BriefData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [merchantName, setMerchantName] = useState("");
  const [momentName, setMomentName] = useState("");
  const [targetQuarter, setTargetQuarter] = useState("");
  const [lastSaved, setLastSaved] = useState<string>("");

  const saveTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load pitch metadata + check for existing brief
  useEffect(() => {
    async function init() {
      // Fetch pitch
      const pitchRes = await fetch(`/api/pitch/${pitchId}`);
      const pitch = await pitchRes.json();
      if (pitch.targetQuarter) setTargetQuarter(pitch.targetQuarter);

      // Resolve names
      const [mmt, mch] = await Promise.all([
        pitch.momentId
          ? fetch(`/api/moments/${pitch.momentId}`).then(r => r.ok ? r.json() : null).catch(() => null)
          : Promise.resolve(null),
        pitch.merchantId
          ? fetch(`/api/merchants/${pitch.merchantId}`).then(r => r.ok ? r.json() : null).catch(() => null)
          : Promise.resolve(null),
      ]);
      if (mmt?.name) setMomentName(mmt.name);
      if (mch?.name) setMerchantName(mch.name);

      // Check for existing brief
      const briefRes = await fetch(`/api/brief?pitchId=${pitchId}`);
      const existing = await briefRes.json();
      if (existing) {
        setBrief(existing);
      } else {
        // Auto-generate
        setGenerating(true);
        const genRes = await fetch("/api/brief/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pitchId }),
        });
        const generated = await genRes.json();
        if (generated?.error) {
          setGenerateError(
            generated.error.includes("api-key") || generated.error.includes("API key") || generated.error.includes("x-api-key")
              ? "Add ANTHROPIC_API_KEY to .env.local to enable AI generation."
              : generated.error
          );
        } else {
          setBrief(generated);
        }
        setGenerating(false);
      }
    }
    init();
  }, [pitchId]);

  const handleEdit = useCallback((field: keyof BriefData, value: string) => {
    setBrief(prev => prev ? { ...prev, [field]: value } : prev);
    clearTimeout(saveTimeouts.current[field as string]);
    saveTimeouts.current[field as string] = setTimeout(async () => {
      if (!brief?.id) return;
      await fetch("/api/brief", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: brief.id, [field]: value, lastAutoSavedAt: new Date().toISOString() }),
      });
      setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }, 1500);
  }, [brief?.id]);

  function handleDownloadPDF() {
    if (!brief) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 20;
    const contentWidth = 210 - margin * 2;
    let y = margin;

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("CREATIVE BRIEF — APPLE PAY PARTNER MARKETING", margin, y);
    y += 8;

    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`Apple Pay × ${merchantName}`, margin, y);
    y += 7;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`${momentName}  ·  ${targetQuarter}`, margin, y);
    y += 12;

    for (const section of SECTIONS) {
      const text = (brief as Record<string, unknown>)[section.field] as string ?? "";
      if (!text) continue;

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text(section.label.toUpperCase(), margin, y);
      y += 5;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(text, contentWidth);
      for (const line of lines) {
        if (y > 270) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += 5;
      }
      y += 6;
    }

    doc.save(`Creative_Brief_${merchantName}_${momentName}.pdf`.replace(/\s+/g, "_"));
  }

  // ── Loading / generating states ───────────────────────────────────────────

  if (generateError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-red-500 max-w-md text-center">{generateError}</p>
        <Link href={`/pitch/${pitchId}`} className="text-sm text-gray-500 underline">← Back to pitch</Link>
      </div>
    );
  }

  if (generating || !brief) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <ProgressMessage />
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 24px", maxWidth: 800, margin: "0 auto" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: "1px solid #e8e8ed", paddingBottom: 16, marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <Link
              href={`/pitch/${pitchId}`}
              style={{ fontSize: "0.75rem", color: "#86868b", textDecoration: "none", display: "block", marginBottom: 4 }}
            >
              ← Back to Partnership Pitch
            </Link>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              Creative Brief
            </p>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1d1d1f", marginBottom: 4 }}>
              Apple Pay × {merchantName}
            </h1>
            <p style={{ fontSize: "0.85rem", color: "#86868b" }}>
              {momentName}{targetQuarter ? ` · ${targetQuarter}` : ""}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            {lastSaved && (
              <span style={{ fontSize: "0.72rem", color: "#86868b" }}>Saved {lastSaved}</span>
            )}
            <button
              onClick={handleDownloadPDF}
              style={{
                padding: "8px 16px", background: "#1d1d1f", color: "white",
                fontSize: "0.85rem", fontWeight: 600, borderRadius: 10, border: "none", cursor: "pointer",
              }}
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Sections ──────────────────────────────────────────────────────── */}
      {SECTIONS.map(({ label, field }) => (
        <section key={field} style={{ marginBottom: 32 }}>
          <h2 style={{
            fontSize: "0.7rem", fontWeight: 700, color: "#86868b",
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
          }}>
            {label}
          </h2>
          <textarea
            value={(brief as Record<string, unknown>)[field] as string ?? ""}
            onChange={e => handleEdit(field, e.target.value)}
            rows={Math.max(3, Math.ceil(((brief as Record<string, unknown>)[field] as string ?? "").length / 120))}
            placeholder={`${label}…`}
            style={{
              width: "100%", fontSize: "0.88rem", color: "#1d1d1f", lineHeight: 1.7,
              fontFamily: "inherit", resize: "vertical", border: "none", outline: "none",
              background: "transparent",
            }}
          />
        </section>
      ))}

    </div>
  );
}

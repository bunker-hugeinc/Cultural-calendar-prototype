"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import jsPDF from "jspdf";

// ── Section definitions ───────────────────────────────────────────────────────

const BRIEF_SECTIONS = [
  // Section 1
  {
    key: "toplineOverview", label: "Topline Overview", section: 1, isList: false,
    hint: "TL;DR of what this campaign is doing and why now.",
  },
  {
    key: "businessObjectives", label: "Business Objectives", section: 1, isList: true,
    hint: "What business problem are we solving? Focus on Apple Pay adoption or partner co-marketing goals.",
  },
  {
    key: "audience", label: "Audience", section: 1, isList: false,
    hint: "Who are we talking to? Include behavioral or attitudinal insight.",
  },
  {
    key: "deliverables", label: "Deliverables", section: 1, isList: true,
    hint: "What's being created? E.g. Discovery Cards, partner email, co-branded social assets.",
  },
  {
    key: "successMetrics", label: "Success Metrics", section: 1, isList: true,
    hint: "2–3 KPIs: CID Provisions, CTR, Spend Uplift, ROAS, Wallet Adds, etc.",
  },
  {
    key: "timingNotes", label: "Timing & Approvals", section: 1, isList: false,
    hint: "When is the desired complete date? What's driving it?",
  },
  {
    key: "additionalReferences", label: "Additional References", section: 1, isList: true,
    hint: "Links or documents relevant to this campaign.",
  },
  // Section 2
  {
    key: "foundationalInsights", label: "Foundational Insights", section: 2, isList: false,
    hint: "Audience insight relevant to this moment and merchant. Reference behavioral patterns.",
  },
  {
    key: "messagingHierarchy", label: "Key Messages and Outcomes", section: 2, isList: true,
    hint: "Messaging hierarchy, ordered most to least important. Format: Label — rationale.",
  },
  {
    key: "creativeTacticalConsiderations", label: "Creative and Tactical Considerations", section: 2, isList: true,
    hint: "Must-haves, watch-outs, or constraints specific to this moment and merchant.",
  },
] as const;

type SectionKey = typeof BRIEF_SECTIONS[number]["key"];

const GENERATING_MESSAGES = [
  "Reviewing moment and merchant details…",
  "Drafting campaign objectives…",
  "Building the messaging hierarchy…",
  "Writing audience insights…",
  "Finalising brief content…",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function toArr(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return val ? [val] : []; }
  }
  return [];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BriefSection({
  label, hint, isList, value, onChange, onBlur,
}: {
  label: string;
  hint: string;
  isList: boolean;
  value: unknown;
  onChange: (val: unknown) => void;
  onBlur: () => void;
}) {
  if (isList) {
    const items = toArr(value);
    const updateItem = (i: number, v: string) => {
      const next = [...items]; next[i] = v; onChange(next);
    };
    const addItem = () => onChange([...items, ""]);
    const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i));

    return (
      <div>
        <label className="block text-sm font-semibold mb-1">{label}</label>
        <p className="text-xs text-gray-400 italic mb-3">{hint}</p>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-gray-400 mt-2 text-sm select-none">–</span>
              <textarea
                value={item}
                onChange={e => updateItem(i, e.target.value)}
                onBlur={onBlur}
                rows={2}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-black"
              />
              <button
                onClick={() => removeItem(i)}
                className="mt-2 text-gray-300 hover:text-red-400 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addItem}
          className="mt-2 text-xs text-gray-400 hover:text-black underline"
        >
          + Add item
        </button>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <p className="text-xs text-gray-400 italic mb-3">{hint}</p>
      <textarea
        value={typeof value === "string" ? value : ""}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        rows={4}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-black"
      />
    </div>
  );
}

// ── PDF export ────────────────────────────────────────────────────────────────

function downloadPDF(brief: Record<string, unknown>, pitch: Record<string, unknown> | null) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 20;
  const pageW = 210;
  const contentW = pageW - margin * 2;
  let y = margin;

  const checkPage = () => { if (y > 265) { doc.addPage(); y = margin; } };

  const sectionHeader = (label: string) => {
    checkPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(label, margin, y);
    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
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
    if (!text) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(text, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 4;
  };

  const bulletList = (items: string[]) => {
    if (!items?.length) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    items.forEach(item => {
      checkPage();
      doc.text("–", margin + 2, y);
      const lines = doc.splitTextToSize(item, contentW - 8);
      doc.text(lines, margin + 8, y);
      y += lines.length * 5 + 2;
    });
    y += 2;
  };

  const momentName = (pitch?.momentName as string) ?? "";
  const merchantName = (pitch?.merchantName as string) ?? "";
  const targetQuarter = (pitch?.targetQuarter as string) ?? "FY";
  const momentCategory = (pitch?.momentCategory as string) ?? momentName;

  // ── Page 1 header ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Apple Pay", margin, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`${targetQuarter} Acquisition Marketing Brief`, pageW - margin, y, { align: "right" });
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Partner Marketing — ${momentCategory}`, pageW - margin, y, { align: "right" });
  y += 8;

  doc.setDrawColor(0, 0, 0);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  if (pitch?.campaignHeadline) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(pitch.campaignHeadline as string, margin, y);
    y += 8;
  }

  // Section 1
  sectionHeader("Topline Overview");
  promptLabel("What are we doing? A quick snapshot of the assignment (2–3 sentences). Think of it as your TL;DR.");
  bodyText(brief.toplineOverview as string ?? "");

  sectionHeader("Business Objectives");
  promptLabel("What business problem are we trying to solve? A brief overview of the 'why' for this initiative.");
  bulletList(toArr(brief.businessObjectives));

  sectionHeader("Audience");
  promptLabel("Who are we talking to? If more than one audience, note which is primary.");
  bodyText(brief.audience as string ?? "");

  sectionHeader("Deliverables");
  promptLabel("What's being created, exactly? Use a bulleted list.");
  bulletList(toArr(brief.deliverables));

  sectionHeader("Success Metrics");
  promptLabel("How will we know this worked? List the KPIs that matter most (no more than 2–3).");
  bulletList(toArr(brief.successMetrics));

  sectionHeader("Timing & Approvals");
  promptLabel("When is the desired complete date? What's driving it? Who needs to approve it?");
  bodyText(brief.timingNotes as string ?? "");
  bodyText("Approvers include Partner Marketing, WW Legal, Privacy and Security Council, and Marcom.");

  sectionHeader("Additional References");
  promptLabel("List and/or link to any additional documents or reference materials.");
  const refs = toArr(brief.additionalReferences);
  refs.length > 0 ? bulletList(refs) : bodyText("—");

  // ── Page 2 ──
  doc.addPage();
  y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text("Section 2: Content and message detail", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Prompts specific to the type of initiative, to help make brief-writing easier.", margin, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`Initiative type: Partner Marketing — ${momentName}`, margin, y);
  y += 10;

  sectionHeader("Foundational Insights");
  promptLabel("Please list any foundational insights relevant to understanding the target audience (mindset, behaviors, competitive landscape).");
  bodyText(brief.foundationalInsights as string ?? "");

  sectionHeader("Key Messages and Outcomes");
  promptLabel("What are we saying? Outline the messaging hierarchy for this work. For best results, avoid executional prescriptiveness.");
  bulletList(toArr(brief.messagingHierarchy));

  sectionHeader("Creative and Tactical Considerations");
  promptLabel("List any must-haves, watch-outs, or reference toolkits. Avoid being too prescriptive.");
  bulletList(toArr(brief.creativeTacticalConsiderations));

  checkPage();
  sectionHeader("Merchant Partner");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(merchantName || "—", margin, y);
  y += 5;
  if (pitch?.offerMechanics) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(pitch.offerMechanics as string, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 4;
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(
      `Generated by Cultural Calendar · Apple Pay Partner Marketing · ${new Date().toLocaleDateString()}`,
      margin, 290
    );
    doc.text(`${i} / ${pageCount}`, pageW - margin, 290, { align: "right" });
  }

  const merchantSlug = merchantName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const momentSlug = momentName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  doc.save(`${merchantSlug}-${momentSlug}-brief.pdf`);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BriefPage() {
  const params = useParams();
  const pitchId = params.id as string;

  const [pageState, setPageState] = useState<"loading" | "idle" | "generating" | "ready" | "error">("loading");
  const [brief, setBrief] = useState<Record<string, unknown> | null>(null);
  const [pitch, setPitch] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingMsg, setGeneratingMsg] = useState(GENERATING_MESSAGES[0]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const pendingChanges = useRef<Record<string, unknown>>({});
  const saveTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const msgInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load pitch + check for existing brief
  useEffect(() => {
    (async () => {
      try {
        // Fetch pitch
        const pitchRes = await fetch(`/api/pitch/${pitchId}`);
        if (!pitchRes.ok) throw new Error("Could not load pitch");
        const pitchData = await pitchRes.json();

        // Resolve moment/merchant names
        const [mmt, mch] = await Promise.all([
          pitchData.momentId
            ? fetch(`/api/moments/${pitchData.momentId}`).then(r => r.ok ? r.json() : null).catch(() => null)
            : Promise.resolve(null),
          pitchData.merchantId
            ? fetch(`/api/merchants/${pitchData.merchantId}`).then(r => r.ok ? r.json() : null).catch(() => null)
            : Promise.resolve(null),
        ]);

        const enrichedPitch = {
          ...pitchData,
          momentName: mmt?.name ?? "",
          merchantName: mch?.name ?? "",
          momentCategory: mmt?.category ?? "",
        };
        setPitch(enrichedPitch);

        // Check for existing brief
        const briefRes = await fetch(`/api/pitch/${pitchId}/brief-data`);
        if (briefRes.ok) {
          const briefData = await briefRes.json();
          if (briefData?.id) {
            setBrief(briefData);
            setPageState("ready");
            return;
          }
        }
        setPageState("idle");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
        setPageState("error");
      }
    })();
  }, [pitchId]);

  const generate = useCallback(async () => {
    setPageState("generating");
    setError(null);

    let msgIdx = 0;
    msgInterval.current = setInterval(() => {
      msgIdx = (msgIdx + 1) % GENERATING_MESSAGES.length;
      setGeneratingMsg(GENERATING_MESSAGES[msgIdx]);
    }, 4000);

    try {
      const res = await fetch("/api/brief/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitchId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Generation failed (${res.status})`);
      }
      const data = await res.json();
      setBrief(data);
      setPageState("ready");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setPageState("error");
    } finally {
      if (msgInterval.current) clearInterval(msgInterval.current);
    }
  }, [pitchId]);

  const save = useCallback(async () => {
    if (!brief?.id || Object.keys(pendingChanges.current).length === 0) return;
    const changes = { ...pendingChanges.current };
    pendingChanges.current = {};
    try {
      await fetch(`/api/brief/${brief.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      setLastSaved(new Date());
    } catch { /* swallow — best effort */ }
  }, [brief?.id]);

  const handleChange = useCallback((key: string, value: unknown) => {
    setBrief(prev => prev ? { ...prev, [key]: value } : prev);
    pendingChanges.current[key] = value;
    clearTimeout(saveTimeouts.current[key]);
    saveTimeouts.current[key] = setTimeout(save, 1500);
  }, [save]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (brief?.id && Object.keys(pendingChanges.current).length > 0) {
        navigator.sendBeacon(`/api/brief/${brief.id}`, JSON.stringify(pendingChanges.current));
      }
    };
  }, [brief?.id]);

  // ── Render states ──────────────────────────────────────────────────────────

  if (pageState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading brief…</p>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-500 text-sm max-w-sm text-center">{error}</p>
        <button
          onClick={() => { setError(null); setPageState("idle"); }}
          className="text-sm underline text-gray-600"
        >
          Try again
        </button>
        <Link href={`/pitch/${pitchId}`} className="text-sm text-gray-400 hover:underline">
          ← Back to pitch
        </Link>
      </div>
    );
  }

  if (pageState === "generating") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">{generatingMsg}</p>
      </div>
    );
  }

  if (pageState === "idle") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold mb-2">Creative Brief</h1>
          {pitch && (
            <p className="text-sm text-gray-500 mb-2">
              {pitch.merchantName as string} × {pitch.momentName as string}
            </p>
          )}
          <p className="text-sm text-gray-400">
            Generate a full Apple Pay Partner Marketing brief based on the approved pitch details.
            You&apos;ll be able to edit every section before downloading the PDF.
          </p>
        </div>
        <button
          onClick={generate}
          className="px-6 py-3 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Generate Brief with Claude
        </button>
        <Link href={`/pitch/${pitchId}`} className="text-sm text-gray-400 hover:underline">
          ← Back to pitch
        </Link>
      </div>
    );
  }

  // state === "ready"
  const section1 = BRIEF_SECTIONS.filter(s => s.section === 1);
  const section2 = BRIEF_SECTIONS.filter(s => s.section === 2);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link href={`/pitch/${pitchId}`} className="text-sm text-gray-400 hover:underline block mb-2">
            ← Back to pitch
          </Link>
          <h1 className="text-2xl font-semibold">Creative Brief</h1>
          {pitch && (
            <p className="text-sm text-gray-500 mt-1">
              {pitch.merchantName as string} × {pitch.momentName as string}
              {pitch.targetQuarter ? ` · ${pitch.targetQuarter}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {lastSaved && (
            <span className="text-xs text-gray-400">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={generate}
            className="text-sm text-gray-500 hover:underline"
          >
            Regenerate
          </button>
          <button
            onClick={() => brief && pitch && downloadPDF(brief, pitch)}
            className="px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* Section 1 */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
            Section 1 — Campaign Logistics
          </span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
        <div className="space-y-8">
          {section1.map(s => (
            <BriefSection
              key={s.key}
              label={s.label}
              hint={s.hint}
              isList={s.isList}
              value={brief?.[s.key]}
              onChange={val => handleChange(s.key, val)}
              onBlur={save}
            />
          ))}
        </div>
      </div>

      {/* Section 2 */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
            Section 2 — Content and Message Detail
          </span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
        <p className="text-xs text-gray-400 text-center mb-6">
          Initiative type: Partner Marketing — {pitch?.momentName as string ?? ""}
        </p>
        <div className="space-y-8">
          {section2.map(s => (
            <BriefSection
              key={s.key}
              label={s.label}
              hint={s.hint}
              isList={s.isList}
              value={brief?.[s.key]}
              onChange={val => handleChange(s.key, val)}
              onBlur={save}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

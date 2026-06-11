"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────

interface PitchData {
  id: string;
  title: string;
  status: string;
  targetQuarter: string | null;
  momentId: string | null;
  merchantId: string | null;
  businessRationale: string | null;
  offerMechanics: string | null;
  additionalNotes: string | null;
  channelStrategy: string | null;
  influencerStrategy: string | null;
  audienceReachNarrative: string | null;
  transactionOpportunityNarrative: string | null;
  coMarketingValueNarrative: string | null;
  pocSearchResults: string | null;
  documentGeneratedAt: string | null;
  approvedAt: string | null;
  sentAt: string | null;
}

interface POCData {
  pocs: Array<{
    name: string | null;
    title: string;
    confidence: "confirmed" | "likely" | "inferred";
    source?: string;
    linkedinHint?: string | null;
    notes?: string;
  }>;
  searchSucceeded: boolean;
  guidance?: string;
}

// ── EditableTextarea ─────────────────────────────────────────────────────────

function EditableTextarea({
  value,
  onChange,
  onBlur,
  placeholder,
  minRows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  placeholder?: string;
  minRows?: number;
}) {
  const rows = Math.max(minRows, Math.ceil((value?.length ?? 0) / 80));
  return (
    <textarea
      value={value ?? ""}
      onChange={e => onChange(e.target.value)}
      onBlur={e => onBlur?.(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        fontSize: "0.88rem",
        lineHeight: 1.7,
        fontFamily: "inherit",
        background: "transparent",
        border: "none",
        outline: "none",
        resize: "vertical",
        color: "#1d1d1f",
      }}
    />
  );
}

// ── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return <span className="spinner" style={{ width: 14, height: 14 }} />;
}

// ── formatPitchAsText ────────────────────────────────────────────────────────

function formatPitchAsText(pitch: PitchData, merchantName: string, momentName: string): string {
  const lines = [
    `APPLE PAY × ${merchantName.toUpperCase()}`,
    `${momentName}  ·  ${pitch.targetQuarter ?? ""}`,
    "",
    "PARTNERSHIP OVERVIEW",
    pitch.businessRationale ?? "",
    "",
    "ROI NARRATIVE",
    "",
    "Audience Reach",
    pitch.audienceReachNarrative ?? "",
    "",
    "Transaction Opportunity",
    pitch.transactionOpportunityNarrative ?? "",
    "",
    "Co-Marketing Value",
    pitch.coMarketingValueNarrative ?? "",
    "",
    "PROPOSED ACTIVATION",
    pitch.offerMechanics ?? "",
  ];

  if (pitch.channelStrategy) lines.push("", "CHANNEL STRATEGY", pitch.channelStrategy);
  if (pitch.influencerStrategy) lines.push("", "INFLUENCER AMPLIFICATION", pitch.influencerStrategy);
  if (pitch.additionalNotes) lines.push("", "NOTES", pitch.additionalNotes);

  lines.push("", "---", "Prepared by Apple Pay Partner Marketing");
  return lines.join("\n").trim();
}

// ── Status styles ────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; bg: string; color: string; border: string }> = {
  draft:    { label: "Draft",    bg: "#f5f5f7",             color: "#6e6e73", border: "#d2d2d7" },
  sent:     { label: "Sent",     bg: "#e3f2fd",             color: "#0071e3", border: "#b3d9fb" },
  approved: { label: "Approved", bg: "rgba(52,199,89,0.1)", color: "#248a3d", border: "#b3e6c1" },
  rejected: { label: "Rejected", bg: "rgba(255,59,48,0.1)", color: "#cc2200", border: "#ffbcb8" },
  ready:    { label: "Ready",    bg: "rgba(52,199,89,0.1)", color: "#248a3d", border: "#b3e6c1" },
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PitchDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();


  const [pitch, setPitch] = useState<PitchData | null>(null);
  const [momentName, setMomentName] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pocData, setPocData] = useState<POCData | null>(null);
  const [isSearchingPOC, setIsSearchingPOC] = useState(false);
  const [pocError, setPocError] = useState<string | null>(null);
  const [pitchQueue, setPitchQueue] = useState<string[]>([]);
  const [currentPitchIndex, setCurrentPitchIndex] = useState(-1);

  const saveTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingChanges = useRef<Record<string, string>>({});
  const hasPending = useRef(false);

  // Load pitch + names
  useEffect(() => {
    fetch(`/api/pitch/${id}`)
      .then(r => r.json())
      .then(async (data: PitchData) => {
        setPitch(data);
        if (data.pocSearchResults) {
          try { setPocData(JSON.parse(data.pocSearchResults)); } catch { /* ignore */ }
        }

        // Resolve moment/merchant names
        const [mmt, mch] = await Promise.all([
          data.momentId
            ? fetch(`/api/moments/${data.momentId}`).then(r => r.ok ? r.json() : null).catch(() => null)
            : Promise.resolve(null),
          data.merchantId
            ? fetch(`/api/merchants/${data.merchantId}`).then(r => r.ok ? r.json() : null).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (mmt?.name) setMomentName(mmt.name);
        if (mch?.name) setMerchantName(mch.name);
      })
      .finally(() => setLoading(false));

    // Load pitch queue from sessionStorage
    try {
      const stored = sessionStorage.getItem("pitchQueue");
      if (stored) {
        const queue: string[] = JSON.parse(stored);
        const idx = queue.indexOf(id);
        if (idx >= 0) {
          setPitchQueue(queue);
          setCurrentPitchIndex(idx);
        }
      }
    } catch { /* ignore */ }
  }, [id]);

  // Auto-generate if ?generate=true (read from window.location to avoid useSearchParams Suspense requirement)
  useEffect(() => {
    if (!loading && pitch && id) {
      const shouldGenerate = new URLSearchParams(window.location.search).get("generate") === "true";
      if (shouldGenerate) {
        handleGenerate();
        router.replace(`/pitch/${id}`);
      }
    }
  }, [loading, pitch, id]);

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch(`/api/pitch/${id}/generate-document`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.error) {
        setGenerateError(data.error.includes("API key") || data.error.includes("api-key")
          ? "Add ANTHROPIC_API_KEY to .env.local to enable AI generation."
          : data.error);
      } else if (data.success) {
        setPitch(prev => prev ? {
          ...prev,
          businessRationale: data.partnershipOverview ?? prev.businessRationale,
          offerMechanics: data.proposedActivation ?? prev.offerMechanics,
          targetQuarter: data.targetQuarter ?? prev.targetQuarter,
          audienceReachNarrative: data.audienceReachNarrative ?? prev.audienceReachNarrative,
          transactionOpportunityNarrative: data.transactionOpportunityNarrative ?? prev.transactionOpportunityNarrative,
          coMarketingValueNarrative: data.coMarketingValueNarrative ?? prev.coMarketingValueNarrative,
        } : prev);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function savePitchFields(fields: Record<string, string>) {
    await fetch(`/api/pitch/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...fields, lastAutoSavedAt: new Date().toISOString() }),
    });
    setLastSaved(new Date());
    Object.keys(fields).forEach(k => delete pendingChanges.current[k]);
    if (Object.keys(pendingChanges.current).length === 0) hasPending.current = false;
  }

  const handleEdit = useCallback((field: keyof PitchData, value: string) => {
    setPitch(prev => prev ? { ...prev, [field]: value } : prev);
    pendingChanges.current[field] = value;
    hasPending.current = true;
    clearTimeout(saveTimeouts.current[field]);
    saveTimeouts.current[field] = setTimeout(() => {
      savePitchFields({ [field]: value });
    }, 1500);
  }, [id]);

  function handleBlur(field: keyof PitchData, value: string) {
    clearTimeout(saveTimeouts.current[field]);
    delete pendingChanges.current[field];
    if (Object.keys(pendingChanges.current).length === 0) hasPending.current = false;
    savePitchFields({ [field]: value });
  }

  // Flush pending saves on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimeouts.current).forEach(clearTimeout);
      if (hasPending.current && Object.keys(pendingChanges.current).length > 0) {
        navigator.sendBeacon(
          `/api/pitch/${id}`,
          JSON.stringify({ ...pendingChanges.current, lastAutoSavedAt: new Date().toISOString() })
        );
      }
    };
  }, [id]);

  async function updateStatus(newStatus: string) {
    setStatusUpdating(true);
    const updates: Record<string, string> = { status: newStatus };
    if (newStatus === "sent") updates.sentAt = new Date().toISOString();
    if (newStatus === "approved") updates.approvedAt = new Date().toISOString();
    await fetch(`/api/pitch/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setPitch(prev => prev ? { ...prev, ...updates } : prev);
    setStatusUpdating(false);
    router.refresh();
  }

  async function handleFindPOC() {
    setIsSearchingPOC(true);
    setPocError(null);
    try {
      const res = await fetch(`/api/pitch/${id}/find-poc`, { method: "POST" });
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = await res.json();
      setPocData(data);
    } catch (err: any) {
      setPocError("Contact search failed. Please try again.");
    } finally {
      setIsSearchingPOC(false);
    }
  }

  // ── Loading states ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: "40px 24px", maxWidth: 800, margin: "0 auto" }}>
        <p style={{ color: "#86868b" }}>Loading pitch…</p>
      </div>
    );
  }

  if (!pitch) {
    return (
      <div style={{ padding: "40px 24px", maxWidth: 800, margin: "0 auto" }}>
        <p>Pitch not found.</p>
      </div>
    );
  }

  if (generating) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <Spinner />
        <p style={{ fontSize: "1rem", color: "#6e6e73" }}>Building your partnership pitch…</p>
      </div>
    );
  }

  const statusMeta = STATUS_META[pitch.status] ?? STATUS_META.draft;
  const displayMerchant = merchantName || pitch.title?.split(" — ")[0]?.replace("Apple Pay × ", "") || "Merchant";
  const displayMoment = momentName || pitch.title?.split(" — ")[1] || "";

  return (
    <div style={{ padding: "40px 24px", maxWidth: 800, margin: "0 auto" }}>

      {/* ── Pitch queue nav bar ──────────────────────────────────────────── */}
      {pitchQueue.length > 1 && (
        <div style={{
          background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 10,
          padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 24, fontSize: "0.85rem",
        }}>
          <span style={{ color: "#1d4ed8" }}>
            Pitch {currentPitchIndex + 1} of {pitchQueue.length} — {merchantName || displayMerchant}
          </span>
          <div style={{ display: "flex", gap: 12 }}>
            {currentPitchIndex > 0 && (
              <button
                onClick={() => router.push(`/pitch/${pitchQueue[currentPitchIndex - 1]}`)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontSize: "0.85rem" }}
              >
                ← Previous
              </button>
            )}
            {currentPitchIndex < pitchQueue.length - 1 && (
              <button
                onClick={() => router.push(`/pitch/${pitchQueue[currentPitchIndex + 1]}`)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontWeight: 600, fontSize: "0.85rem" }}
              >
                Next Pitch →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Back + header controls ───────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <Link href="/pitch" style={{ fontSize: "0.82rem", color: "#86868b", textDecoration: "none" }}>
          ← Pitches
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {lastSaved && (
            <span style={{ fontSize: "0.72rem", color: "#86868b" }}>
              Saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <span style={{
            fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20,
            background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}`,
          }}>
            {statusMeta.label}
          </span>
          {pitch.status === "draft" && (
            <button
              onClick={() => updateStatus("sent")}
              disabled={statusUpdating}
              className="btn btn-primary"
              style={{ fontSize: "0.8rem" }}
            >
              {statusUpdating ? "Updating…" : "Mark as Sent →"}
            </button>
          )}
          {pitch.status === "sent" && (
            <>
              <button onClick={() => updateStatus("approved")} disabled={statusUpdating} className="btn btn-primary" style={{ fontSize: "0.8rem", background: "#248a3d" }}>
                ✓ Mark Approved
              </button>
              <button onClick={() => updateStatus("rejected")} disabled={statusUpdating} className="btn btn-outline" style={{ fontSize: "0.8rem", color: "#cc2200" }}>
                Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Document title ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <p className="eyebrow" style={{ marginBottom: 6 }}>PARTNERSHIP PITCH</p>
        <h1 style={{ fontSize: "1.6rem", marginBottom: 6, lineHeight: 1.2 }}>
          Apple Pay × {displayMerchant}
        </h1>
        <p style={{ fontSize: "0.88rem", color: "#6e6e73" }}>
          {displayMoment}
          {pitch.targetQuarter && (
            <span style={{ marginLeft: 10, padding: "2px 10px", background: "#f5f5f7", borderRadius: 10, fontWeight: 600, fontSize: "0.78rem", color: "#6e6e73" }}>
              {pitch.targetQuarter}
            </span>
          )}
        </p>
      </div>

      {/* ── Regenerate button ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            fontSize: "0.78rem", color: "#0071e3", background: "none", border: "none",
            cursor: "pointer", opacity: generating ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 5,
          }}
        >
          {generating && <Spinner />}
          {generating ? "Regenerating…" : "↺ Regenerate document"}
        </button>
        {generateError && (
          <p style={{ fontSize: "0.75rem", color: "#cc2200", marginTop: 6 }}>{generateError}</p>
        )}
      </div>

      {/* ── Partnership Overview ─────────────────────────────────────────── */}
      <div className="card-p" style={{ marginBottom: 20 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>PARTNERSHIP OVERVIEW</p>
        <EditableTextarea
          value={pitch.businessRationale ?? ""}
          onChange={v => handleEdit("businessRationale", v)}
          onBlur={v => handleBlur("businessRationale", v)}
          placeholder="Generating partnership overview…"
          minRows={4}
        />
      </div>

      {/* ── ROI Narrative ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>ROI NARRATIVE</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>

          <div style={{ background: "#eff6ff", borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              🎯 Audience Reach
            </p>
            <EditableTextarea
              value={pitch.audienceReachNarrative ?? ""}
              onChange={v => handleEdit("audienceReachNarrative", v)}
              onBlur={v => handleBlur("audienceReachNarrative", v)}
              placeholder="Generating audience reach narrative…"
              minRows={3}
            />
          </div>

          <div style={{ background: "#f0fdf4", borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              💳 Transaction Opportunity
            </p>
            <EditableTextarea
              value={pitch.transactionOpportunityNarrative ?? ""}
              onChange={v => handleEdit("transactionOpportunityNarrative", v)}
              onBlur={v => handleBlur("transactionOpportunityNarrative", v)}
              placeholder="Generating transaction opportunity narrative…"
              minRows={3}
            />
          </div>

          <div style={{ background: "#faf5ff", borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              🤝 Co-Marketing Value
            </p>
            <EditableTextarea
              value={pitch.coMarketingValueNarrative ?? ""}
              onChange={v => handleEdit("coMarketingValueNarrative", v)}
              onBlur={v => handleBlur("coMarketingValueNarrative", v)}
              placeholder="Generating co-marketing value narrative…"
              minRows={3}
            />
          </div>

        </div>
      </div>

      {/* ── Proposed Activation ──────────────────────────────────────────── */}
      <div className="card-p" style={{ marginBottom: 20 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>PROPOSED ACTIVATION</p>
        <EditableTextarea
          value={pitch.offerMechanics ?? ""}
          onChange={v => handleEdit("offerMechanics", v)}
          onBlur={v => handleBlur("offerMechanics", v)}
          placeholder="Generating proposed activation…"
          minRows={3}
        />
      </div>

      {/* ── Notes (optional) ─────────────────────────────────────────────── */}
      <div className="card-p" style={{ marginBottom: 20 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>NOTES</p>
        <EditableTextarea
          value={pitch.additionalNotes ?? ""}
          onChange={v => handleEdit("additionalNotes", v)}
          onBlur={v => handleBlur("additionalNotes", v)}
          placeholder="Add any additional notes or context…"
          minRows={2}
        />
      </div>

      {/* ── Points of Contact ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>POINTS OF CONTACT</p>

        {pocError && (
          <p style={{ fontSize: "0.78rem", color: "#cc2200", marginBottom: 8 }}>{pocError}</p>
        )}

        {!pocData && (
          <button
            onClick={handleFindPOC}
            disabled={isSearchingPOC}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 16px", background: "#f5f5f7", borderRadius: 10,
              border: "1px solid #e8e8ed", fontSize: "0.85rem", cursor: "pointer",
              fontFamily: "inherit", opacity: isSearchingPOC ? 0.6 : 1,
            }}
          >
            {isSearchingPOC ? <><Spinner /> Searching for contacts…</> : "🔍 Search for Partnership Contacts"}
          </button>
        )}

        {pocData && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {pocData.pocs.length > 0 && pocData.pocs.map((poc, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 12, padding: 12,
                background: "white", borderRadius: 10, border: "1px solid #e8e8ed",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", background: "#f5f5f7",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.85rem", fontWeight: 700, color: "#6e6e73", flexShrink: 0,
                }}>
                  {poc.name ? poc.name[0].toUpperCase() : "?"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1d1d1f" }}>
                      {poc.name ?? "Contact not identified"}
                    </span>
                    <span style={{
                      fontSize: "0.65rem", padding: "1px 7px", borderRadius: 10, fontWeight: 700,
                      background: poc.confidence === "confirmed" ? "rgba(52,199,89,0.12)" : poc.confidence === "likely" ? "#e3f2fd" : "#f5f5f7",
                      color: poc.confidence === "confirmed" ? "#248a3d" : poc.confidence === "likely" ? "#0071e3" : "#6e6e73",
                    }}>
                      {poc.confidence}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "#6e6e73", marginTop: 2 }}>{poc.title}</p>
                  {poc.source && <p style={{ fontSize: "0.72rem", color: "#86868b", marginTop: 2 }}>Source: {poc.source}</p>}
                  {poc.linkedinHint && (
                    <a href={poc.linkedinHint} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: "0.72rem", color: "#0071e3", marginTop: 2, display: "block" }}>
                      Search on LinkedIn →
                    </a>
                  )}
                </div>
              </div>
            ))}

            {pocData.guidance && (
              <div style={{
                padding: "10px 14px", borderRadius: 10, fontSize: "0.85rem",
                background: pocData.searchSucceeded ? "#eff6ff" : "#fffbeb",
                color: pocData.searchSucceeded ? "#1e40af" : "#92400e",
              }}>
                {pocData.searchSucceeded ? "💡 " : "📋 Where to look: "}
                {pocData.guidance}
              </div>
            )}

            <button
              onClick={handleFindPOC}
              disabled={isSearchingPOC}
              style={{ fontSize: "0.75rem", color: "#86868b", background: "none", border: "none", cursor: "pointer", textAlign: "left", textDecoration: "underline" }}
            >
              {isSearchingPOC ? "Searching…" : "Search again"}
            </button>
          </div>
        )}
      </div>

      {/* ── Export + Status ───────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid #e8e8ed", paddingTop: 24, marginBottom: 28 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>EXPORT PITCH</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>

          <button
            onClick={async () => {
              await navigator.clipboard.writeText(formatPitchAsText(pitch, displayMerchant, displayMoment));
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1px solid #d2d2d7", background: "white", fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}
          >
            {copied ? "✓ Copied" : "Copy Text"}
          </button>

          <button
            onClick={() => {
              const subject = encodeURIComponent(`Apple Pay × ${displayMerchant} — ${displayMoment} Partnership Proposal`);
              const body = encodeURIComponent(formatPitchAsText(pitch, displayMerchant, displayMoment));
              fetch(`/api/pitch/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ exportedAt: new Date().toISOString() }),
              });
              window.location.href = `mailto:?subject=${subject}&body=${body}`;
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1px solid #d2d2d7", background: "white", fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}
          >
            ✉ Open as Email Draft
          </button>

          <button
            onClick={() => {
              const text = formatPitchAsText(pitch, displayMerchant, displayMoment);
              const blob = new Blob([text], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `Apple_Pay_Pitch_${displayMerchant}_${displayMoment}`
                .replace(/\s+/g, "_")
                .replace(/[^a-zA-Z0-9_.-]/g, "") + ".txt";
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1px solid #d2d2d7", background: "white", fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}
          >
            ↓ Download .txt
          </button>

        </div>

        {/* Status dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <p className="eyebrow">STATUS</p>
          <select
            value={pitch.status}
            onChange={e => updateStatus(e.target.value)}
            disabled={statusUpdating}
            style={{
              padding: "6px 12px", fontSize: "0.85rem", borderRadius: 8, fontFamily: "inherit",
              fontWeight: 600, cursor: "pointer",
              background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}`,
            }}
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* ── Build Creative Brief CTA ─────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid #e8e8ed", paddingTop: 24 }}>
        {pitch.status === "approved" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Link
              href={`/pitch/${id}/brief`}
              style={{
                display: "block", width: "100%", maxWidth: 360, textAlign: "center",
                padding: "12px 24px", background: "#1d1d1f", color: "white",
                fontWeight: 700, borderRadius: 12, textDecoration: "none", fontSize: "0.9rem",
              }}
            >
              Build Creative Brief →
            </Link>
            {pitch.approvedAt && (
              <p style={{ fontSize: "0.72rem", color: "#86868b" }}>
                Partnership approved · {new Date(pitch.approvedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <button
              disabled
              style={{
                display: "block", width: "100%", maxWidth: 360,
                padding: "12px 24px", background: "#f5f5f7", color: "#aeaeb2",
                fontWeight: 700, borderRadius: 12, border: "none", fontSize: "0.9rem", cursor: "not-allowed",
              }}
            >
              Build Creative Brief →
            </button>
            <p style={{ fontSize: "0.72rem", color: "#86868b" }}>
              Set status to Approved to generate the creative brief
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

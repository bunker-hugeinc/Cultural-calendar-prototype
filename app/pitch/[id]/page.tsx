"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface PitchData {
  id: string;
  title: string;
  status: string;
  targetQuarter: string | null;
  businessRationale: string | null;
  offerMechanics: string | null;
  influencerStrategy: string | null;
  channelStrategy: string | null;
  additionalNotes: string | null;
  momentId: string | null;
  merchantId: string | null;
  sentAt: string | null;
  approvedAt: string | null;
}

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  draft:    { label: "Draft",    bg: "#f5f5f7",             color: "#6e6e73" },
  sent:     { label: "Sent",     bg: "#e3f2fd",             color: "#0071e3" },
  approved: { label: "Approved", bg: "rgba(52,199,89,0.1)", color: "#248a3d" },
  rejected: { label: "Rejected", bg: "rgba(255,59,48,0.1)", color: "#cc2200" },
  ready:    { label: "Ready",    bg: "rgba(52,199,89,0.1)", color: "#248a3d" },
};

function formatPitchAsText(pitch: PitchData): string {
  const merchantName = pitch.title?.split(" — ")[0]?.replace("Apple Pay × ", "") ?? "Merchant";
  const momentName = pitch.title?.split(" — ")[1] ?? "";
  return `APPLE PAY × ${merchantName.toUpperCase()}
${momentName} — ${pitch.targetQuarter ?? ""}

WHY THIS MATTERS
${pitch.businessRationale ?? ""}

WHAT WE'RE PROPOSING
${pitch.offerMechanics ?? ""}

CREATOR AMPLIFICATION
${pitch.influencerStrategy ?? ""}

WHERE WE'LL ACTIVATE
${pitch.channelStrategy ?? ""}${pitch.additionalNotes ? `

NOTES
${pitch.additionalNotes}` : ""}

---
Prepared by Apple Pay Partner Marketing`.trim();
}

export default function PitchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pitch, setPitch] = useState<PitchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Local editable field state
  const [fields, setFields] = useState({
    businessRationale: "",
    offerMechanics: "",
    influencerStrategy: "",
    channelStrategy: "",
    additionalNotes: "",
  });

  useEffect(() => {
    fetch(`/api/pitch/${id}`)
      .then(r => r.json())
      .then(data => {
        setPitch(data);
        setFields({
          businessRationale: data.businessRationale ?? "",
          offerMechanics: data.offerMechanics ?? "",
          influencerStrategy: data.influencerStrategy ?? "",
          channelStrategy: data.channelStrategy ?? "",
          additionalNotes: data.additionalNotes ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const save = useCallback(async (updates: Record<string, string>) => {
    setSaving(true);
    try {
      await fetch(`/api/pitch/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } finally {
      setSaving(false);
    }
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
  }

  function copyToClipboard() {
    if (!pitch) return;
    const text = formatPitchAsText({ ...pitch, ...fields });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openEmailDraft() {
    if (!pitch) return;
    const text = formatPitchAsText({ ...pitch, ...fields });
    const subject = encodeURIComponent(`Apple Pay — ${pitch.title ?? "Partnership Proposal"}`);
    const body = encodeURIComponent(text);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function downloadTxt() {
    if (!pitch) return;
    const text = formatPitchAsText({ ...pitch, ...fields });
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Apple_Pay_Pitch_${(pitch.title ?? "pitch").replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div style={{ padding: "40px 24px", maxWidth: 800, margin: "0 auto" }}><p style={{ color: "#86868b" }}>Loading pitch…</p></div>;
  if (!pitch) return <div style={{ padding: "40px 24px", maxWidth: 800, margin: "0 auto" }}><p>Pitch not found.</p></div>;

  const statusMeta = STATUS_META[pitch.status] ?? STATUS_META.draft;
  const isApproved = pitch.status === "approved";
  const [momentName, merchantName] = (() => {
    const parts = pitch.title?.split(" — ") ?? [];
    return [parts[1] ?? "", parts[0]?.replace("Apple Pay × ", "") ?? ""];
  })();

  return (
    <div style={{ padding: "40px 24px", maxWidth: 800, margin: "0 auto" }}>
      {/* Back link */}
      <div style={{ marginBottom: 16 }}>
        <Link href="/pitch" style={{ fontSize: "0.82rem", color: "#86868b", textDecoration: "none" }}>← All Pitches</Link>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 4 }}>PITCH BUILDER</p>
          <h1 style={{ fontSize: "1.4rem", marginBottom: 6, lineHeight: 1.2 }}>{pitch.title}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 10px", borderRadius: 10, background: statusMeta.bg, color: statusMeta.color }}>
              {statusMeta.label}
            </span>
            {pitch.targetQuarter && (
              <span style={{ fontSize: "0.72rem", padding: "2px 10px", borderRadius: 10, background: "#f5f5f7", color: "#6e6e73", fontWeight: 600 }}>
                {pitch.targetQuarter}
              </span>
            )}
            {saving && <span style={{ fontSize: "0.72rem", color: "#86868b" }}>Saving…</span>}
          </div>
        </div>

        {/* Status workflow buttons */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {pitch.status === "draft" && (
            <button
              onClick={() => updateStatus("sent")}
              disabled={statusUpdating}
              className="btn btn-primary"
              style={{ fontSize: "0.82rem" }}
            >
              {statusUpdating ? "Updating…" : "Mark as Sent →"}
            </button>
          )}
          {pitch.status === "sent" && (
            <>
              <button onClick={() => updateStatus("approved")} disabled={statusUpdating} className="btn btn-primary" style={{ fontSize: "0.82rem", background: "#248a3d" }}>
                {statusUpdating ? "Updating…" : "✓ Mark Approved"}
              </button>
              <button onClick={() => updateStatus("rejected")} disabled={statusUpdating} className="btn btn-outline" style={{ fontSize: "0.82rem", color: "#cc2200" }}>
                Mark Rejected
              </button>
            </>
          )}
          {pitch.status === "approved" && pitch.momentId && (
            <Link
              href={`/moments/${pitch.momentId}/brief`}
              className="btn btn-primary"
              style={{ textDecoration: "none", fontSize: "0.82rem", background: "#248a3d" }}
            >
              Generate Creative Brief →
            </Link>
          )}
        </div>
      </div>

      {/* Editable sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 28 }}>
        {([
          { key: "businessRationale", label: `Why This Matters to ${merchantName || "the Merchant"}` },
          { key: "offerMechanics",    label: "What We're Proposing" },
          { key: "influencerStrategy", label: "Creator Amplification" },
          { key: "channelStrategy",   label: "Where We'll Activate" },
          { key: "additionalNotes",   label: "Notes & Next Steps" },
        ] as const).map(({ key, label }) => (
          <div key={key} className="card-p">
            <p className="eyebrow" style={{ marginBottom: 8 }}>{label.toUpperCase()}</p>
            <textarea
              value={fields[key]}
              onChange={e => setFields(prev => ({ ...prev, [key]: e.target.value }))}
              onBlur={() => save({ [key]: fields[key] })}
              rows={key === "additionalNotes" ? 3 : 5}
              style={{
                width: "100%", fontSize: "0.88rem", lineHeight: 1.6, fontFamily: "inherit",
                border: "none", outline: "none", resize: "vertical", background: "transparent",
                color: "#1d1d1f",
              }}
              placeholder={`Enter ${label.toLowerCase()}…`}
            />
          </div>
        ))}
      </div>

      {/* Save button */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => save(fields)}
          disabled={saving}
          className="btn btn-primary"
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Export section */}
      <div style={{ borderTop: "1px solid #e8e8ed", paddingTop: 20, marginBottom: 28 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>EXPORT</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={copyToClipboard}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1px solid #d2d2d7", background: "white", fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}
          >
            {copied ? "✓ Copied" : "Copy Text"}
          </button>
          <button
            onClick={openEmailDraft}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1px solid #d2d2d7", background: "white", fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}
          >
            Open as Email Draft
          </button>
          <button
            onClick={downloadTxt}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1px solid #d2d2d7", background: "white", fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}
          >
            Download .txt
          </button>
        </div>
      </div>

      {/* Creative Brief gate */}
      {!isApproved && pitch.momentId && (
        <div style={{ padding: "20px 24px", background: "#f5f5f7", borderRadius: 12, marginBottom: 20 }}>
          <p style={{ fontSize: "0.88rem", color: "#6e6e73", marginBottom: 12, lineHeight: 1.6 }}>
            Build and send your partnership pitch first. Once the merchant approves, you can generate the Creative Brief.
          </p>
          {pitch.momentId && (
            <Link
              href={`/moments/${pitch.momentId}/brief`}
              style={{ fontSize: "0.75rem", color: "#86868b", textDecoration: "underline" }}
            >
              Skip approval (demo mode)
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

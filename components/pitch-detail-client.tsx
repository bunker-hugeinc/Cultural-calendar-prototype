"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PitchMoment {
  id: string; name: string; startDate: string; category: string;
  ecommerceScore: number | null; audienceFit: number | null; whiteSpaceScore: number | null;
  isPrimary: boolean;
}

interface PitchMerchant {
  id: string; name: string; category: string; partnerGroup: string | null;
  merchantSignals: string | null; isPrimary: boolean;
}

interface ChannelRec {
  channel: string; channelLabel: string;
  recommended: boolean; rationale: string; suggestedFormat: string;
}

interface Influencer {
  type: string; realExamples: string; audienceSize: string;
  contentStyle: string; whyThisMoment: string; campaignAngle: string;
}

interface PitchData {
  id: string; title: string; type: string; status: string;
  situation: string | null; campaignConcept: string | null;
  campaignHeadline: string | null; keyMessages: string | null;
  channelStrategy: string | null; influencerStrategy: string | null;
  nextSteps: string | null; targetQuarter: string | null;
  moments: PitchMoment[]; merchants: PitchMerchant[];
}

interface AllMoment { id: string; name: string; startDate: string; }
interface AllMerchant { id: string; name: string; category: string; }

interface Props {
  pitch: PitchData;
  allMoments: AllMoment[];
  allMerchants: AllMerchant[];
}

const QUARTERS = ["FQ1 2026", "FQ2 2026", "FQ3 2026", "FQ4 2026", "FQ1 2027", "FQ2 2027", "FQ3 2027", "FQ4 2027"];

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({
  eyebrow, title, children, onGenerate, generating, hasContent,
}: {
  eyebrow: string; title: string; children: React.ReactNode;
  onGenerate?: () => void; generating?: boolean; hasContent?: boolean;
}) {
  return (
    <div className="card-p" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 2 }}>{eyebrow}</p>
          <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>{title}</h3>
        </div>
        {onGenerate && (
          <button
            onClick={onGenerate}
            disabled={generating}
            style={{
              fontSize: "0.75rem", fontWeight: 600, color: "#0071e3",
              background: generating ? "#f0f7ff" : "rgba(0,113,227,0.08)",
              border: "1px solid rgba(0,113,227,0.2)",
              padding: "4px 12px", borderRadius: 8, cursor: generating ? "default" : "pointer",
              opacity: generating ? 0.7 : 1, fontFamily: "inherit",
            }}
          >
            {generating ? "Generating…" : hasContent ? "Regenerate" : "Generate with Claude"}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function EditableText({
  value, onChange, placeholder, rows = 4,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e8e8ed",
        fontSize: "0.9rem", color: "#1d1d1f", lineHeight: 1.6, fontFamily: "inherit",
        resize: "vertical", outline: "none", boxSizing: "border-box", background: "#fafafa",
      }}
    />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function PitchDetailClient({ pitch, allMoments, allMerchants }: Props) {
  // Section state
  const [situation, setSituation] = useState(pitch.situation ?? "");
  const [headline, setHeadline] = useState(pitch.campaignHeadline ?? "");
  const [description, setDescription] = useState(pitch.campaignConcept ?? "");
  const [keyMessages, setKeyMessages] = useState<string[]>(() => {
    try { if (pitch.keyMessages) return JSON.parse(pitch.keyMessages); } catch { /* */ }
    return ["", "", ""];
  });
  const [channels, setChannels] = useState<ChannelRec[]>(() => {
    try { if (pitch.channelStrategy) return JSON.parse(pitch.channelStrategy); } catch { /* */ }
    return [];
  });
  const [influencers, setInfluencers] = useState<Influencer[]>(() => {
    try { if (pitch.influencerStrategy) return JSON.parse(pitch.influencerStrategy); } catch { /* */ }
    return [];
  });
  const [nextSteps, setNextSteps] = useState(pitch.nextSteps ?? "");

  // Sidebar state
  const [title, setTitle] = useState(pitch.title);
  const [status, setStatus] = useState(pitch.status);
  const [quarter, setQuarter] = useState(pitch.targetQuarter ?? "");
  const [moments, setMoments] = useState<PitchMoment[]>(pitch.moments);
  const [pitchMerchants, setPitchMerchants] = useState<PitchMerchant[]>(pitch.merchants);
  const [addMomentId, setAddMomentId] = useState("");
  const [addMerchantId, setAddMerchantId] = useState("");

  // Generating state per section
  const [gen, setGen] = useState<Record<string, boolean>>({});

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  // Debounced save
  function scheduleSave(fields: Record<string, unknown>) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(`/api/pitches/${pitch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
    }, 800);
  }

  // Generate a section
  async function generate(section: string) {
    setGen(g => ({ ...g, [section]: true }));
    try {
      const res = await fetch(`/api/pitches/${pitch.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(`Error: ${data.error ?? "Generation failed"}`); return; }

      if (section === "situation" && data.situation) {
        setSituation(data.situation);
        showToast("Situation generated");
      }
      if (section === "concept") {
        if (data.headline) setHeadline(data.headline);
        if (data.description) setDescription(data.description);
        if (data.keyMessages) setKeyMessages(data.keyMessages);
        showToast("Campaign concept generated");
      }
      if (section === "channels" && data.channels) {
        setChannels(data.channels);
        showToast("Channel strategy generated");
      }
      if (section === "influencers" && data.influencers) {
        setInfluencers(data.influencers);
        showToast("Influencer strategy generated");
      }
    } finally {
      setGen(g => ({ ...g, [section]: false }));
    }
  }

  // Sidebar actions
  async function toggleStatus() {
    const next = status === "draft" ? "ready" : "draft";
    setStatus(next);
    await fetch(`/api/pitches/${pitch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  }

  async function addMoment() {
    if (!addMomentId) return;
    const m = allMoments.find(m => m.id === addMomentId);
    if (!m || moments.find(pm => pm.id === addMomentId)) return;
    await fetch(`/api/pitches/${pitch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addMomentId }),
    });
    setMoments(prev => [...prev, { id: m.id, name: m.name, startDate: m.startDate, category: "excite", ecommerceScore: null, audienceFit: null, whiteSpaceScore: null, isPrimary: false }]);
    setAddMomentId("");
  }

  async function removeMoment(momentId: string) {
    await fetch(`/api/pitches/${pitch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeMomentId: momentId }),
    });
    setMoments(prev => prev.filter(m => m.id !== momentId));
  }

  async function addMerchant() {
    if (!addMerchantId) return;
    const m = allMerchants.find(m => m.id === addMerchantId);
    if (!m || pitchMerchants.find(pm => pm.id === addMerchantId)) return;
    await fetch(`/api/pitches/${pitch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addMerchantId }),
    });
    setPitchMerchants(prev => [...prev, { id: m.id, name: m.name, category: m.category, partnerGroup: null, merchantSignals: null, isPrimary: false }]);
    setAddMerchantId("");
  }

  async function removeMerchant(merchantId: string) {
    await fetch(`/api/pitches/${pitch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeMerchantId: merchantId }),
    });
    setPitchMerchants(prev => prev.filter(m => m.id !== merchantId));
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, maxWidth: 1100, margin: "0 auto", padding: "32px 24px", alignItems: "start" }}>

      {/* ── Main content ──────────────────────────────────────────────────────── */}
      <div>
        <div style={{ marginBottom: 8 }}>
          <Link href="/pitches" style={{ fontSize: "0.82rem", color: "#86868b", textDecoration: "none" }}>← Pitches</Link>
        </div>
        <div style={{ marginBottom: 28 }}>
          <p className="eyebrow" style={{ marginBottom: 4 }}>PITCH BUILDER</p>
          <h1 style={{ fontSize: "1.7rem", marginBottom: 4 }}>{title}</h1>
          <p style={{ fontSize: "0.82rem", color: "#86868b" }}>
            {moments[0]?.name ?? "No moment"} × {pitchMerchants[0]?.name ?? "No merchant"}
            {quarter && ` · ${quarter}`}
          </p>
        </div>

        {/* 1 — Situation */}
        <SectionCard
          eyebrow="SECTION 1"
          title="Situation"
          onGenerate={() => generate("situation")}
          generating={gen.situation}
          hasContent={!!situation}
        >
          <EditableText
            value={situation}
            onChange={v => { setSituation(v); scheduleSave({ situation: v }); }}
            placeholder="Why now, why this merchant, where is the Apple Pay opportunity? Click 'Generate with Claude' to start."
            rows={5}
          />
        </SectionCard>

        {/* 2 — Campaign Concept */}
        <SectionCard
          eyebrow="SECTION 2"
          title="Campaign Concept"
          onGenerate={() => generate("concept")}
          generating={gen.concept}
          hasContent={!!headline}
        >
          <div style={{ marginBottom: 12 }}>
            <label className="eyebrow" style={{ display: "block", marginBottom: 4 }}>HEADLINE</label>
            <input
              type="text"
              value={headline}
              onChange={e => { setHeadline(e.target.value); scheduleSave({ campaignHeadline: e.target.value }); }}
              placeholder="Campaign headline…"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e8e8ed", fontSize: "1.05rem", fontWeight: 600, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "#fafafa" }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="eyebrow" style={{ display: "block", marginBottom: 4 }}>DESCRIPTION</label>
            <EditableText
              value={description}
              onChange={v => { setDescription(v); scheduleSave({ campaignConcept: v }); }}
              placeholder="Campaign description…"
              rows={3}
            />
          </div>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 8 }}>KEY MESSAGES</label>
            {(keyMessages.length ? keyMessages : ["", "", ""]).map((msg, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: "#86868b", fontSize: "0.75rem", marginTop: 10, minWidth: 16 }}>{i + 1}.</span>
                <input
                  type="text"
                  value={msg}
                  onChange={e => {
                    const next = [...keyMessages];
                    next[i] = e.target.value;
                    setKeyMessages(next);
                    scheduleSave({ keyMessages: JSON.stringify(next) });
                  }}
                  placeholder={`Key message ${i + 1}…`}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e8e8ed", fontSize: "0.88rem", fontFamily: "inherit", outline: "none", background: "#fafafa" }}
                />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 3 — Channel Strategy */}
        <SectionCard
          eyebrow="SECTION 3"
          title="Channel Strategy"
          onGenerate={() => generate("channels")}
          generating={gen.channels}
          hasContent={channels.length > 0}
        >
          {channels.length > 0 ? (
            channels.map((ch, i) => (
              <ChannelRow key={ch.channel} ch={ch} onChange={updated => {
                const next = [...channels];
                next[i] = updated;
                setChannels(next);
                scheduleSave({ channelStrategy: JSON.stringify(next) });
              }} />
            ))
          ) : (
            <p style={{ fontSize: "0.85rem", color: "#86868b", padding: "12px 0" }}>
              No channel strategy yet. Click Generate to pre-populate from moment scoring, or add manually.
            </p>
          )}
        </SectionCard>

        {/* 4 — Influencer Strategy */}
        <SectionCard
          eyebrow="SECTION 4"
          title="Influencer Strategy"
          onGenerate={() => generate("influencers")}
          generating={gen.influencers}
          hasContent={influencers.length > 0}
        >
          {influencers.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {influencers.map((inf, i) => (
                <div key={i} style={{ padding: "14px 16px", background: "#fafafa", borderRadius: 10, border: "1px solid #e8e8ed" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1d1d1f", marginBottom: 2 }}>{inf.type}</p>
                      <p style={{ fontSize: "0.78rem", color: "#0071e3" }}>{inf.realExamples}</p>
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "#86868b", flexShrink: 0 }}>{inf.audienceSize}</span>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "#6e6e73", marginBottom: 6, lineHeight: 1.5 }}>{inf.contentStyle}</p>
                  <p style={{ fontSize: "0.78rem", color: "#1d1d1f", lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600 }}>Campaign angle: </span>{inf.campaignAngle}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "0.85rem", color: "#86868b", padding: "12px 0" }}>
              No influencer strategy yet. Generate to get 3 creator recommendations for this moment × merchant.
            </p>
          )}
        </SectionCard>

        {/* 5 — Next Steps */}
        <SectionCard eyebrow="SECTION 5" title="Next Steps">
          <EditableText
            value={nextSteps}
            onChange={v => { setNextSteps(v); scheduleSave({ nextSteps: v }); }}
            placeholder="Merchant contact: ...&#10;Internal teams: ...&#10;Key dates: ..."
            rows={5}
          />
        </SectionCard>

        {/* 6 — Attachments placeholder */}
        <div className="card-p" style={{ marginBottom: 16, opacity: 0.6 }}>
          <p className="eyebrow" style={{ marginBottom: 4 }}>SECTION 6</p>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 8 }}>Attachments</h3>
          <p style={{ fontSize: "0.82rem", color: "#86868b" }}>File uploads coming in a future phase.</p>
        </div>
      </div>

      {/* ── Sticky Sidebar ────────────────────────────────────────────────────── */}
      <div style={{ position: "sticky", top: 72 }}>
        <div className="card-p" style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Title */}
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 4 }}>TITLE</label>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); scheduleSave({ title: e.target.value }); }}
              style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e8e8ed", fontSize: "0.88rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Status */}
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>STATUS</label>
            <button
              onClick={toggleStatus}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                border: "none",
                background: status === "ready" ? "rgba(52,199,89,0.12)" : "#f5f5f7",
                color: status === "ready" ? "#248a3d" : "#86868b",
              }}
            >
              {status === "ready" ? "✓ Ready" : "Draft"}
            </button>
          </div>

          {/* Moments */}
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>MOMENTS</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {moments.map(m => (
                <span key={m.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.72rem", padding: "3px 8px", borderRadius: 8, background: "#e3f2fd", color: "#0071e3" }}>
                  {m.name}
                  <button onClick={() => removeMoment(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#0071e3", fontSize: "0.7rem", padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
            <select
              value={addMomentId}
              onChange={e => setAddMomentId(e.target.value)}
              onBlur={addMoment}
              style={{ width: "100%", fontSize: "0.78rem", padding: "5px 8px", borderRadius: 6, border: "1px solid #e8e8ed", fontFamily: "inherit", background: "white", outline: "none", boxSizing: "border-box" }}
            >
              <option value="">+ Add moment</option>
              {allMoments.filter(m => !moments.find(pm => pm.id === m.id)).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Merchants */}
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>MERCHANTS</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {pitchMerchants.map(m => (
                <span key={m.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.72rem", padding: "3px 8px", borderRadius: 8, background: "#e8f5e9", color: "#248a3d" }}>
                  {m.name}
                  <button onClick={() => removeMerchant(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#248a3d", fontSize: "0.7rem", padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
            <select
              value={addMerchantId}
              onChange={e => setAddMerchantId(e.target.value)}
              onBlur={addMerchant}
              style={{ width: "100%", fontSize: "0.78rem", padding: "5px 8px", borderRadius: 6, border: "1px solid #e8e8ed", fontFamily: "inherit", background: "white", outline: "none", boxSizing: "border-box" }}
            >
              <option value="">+ Add merchant</option>
              {allMerchants.filter(m => !pitchMerchants.find(pm => pm.id === m.id)).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Quarter */}
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>TARGET QUARTER</label>
            <select
              value={quarter}
              onChange={e => { setQuarter(e.target.value); scheduleSave({ targetQuarter: e.target.value }); }}
              style={{ width: "100%", fontSize: "0.78rem", padding: "5px 8px", borderRadius: 6, border: "1px solid #e8e8ed", fontFamily: "inherit", background: "white", outline: "none", boxSizing: "border-box" }}
            >
              <option value="">— Quarter —</option>
              {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>

          {/* Generate all */}
          <button
            onClick={() => generate("all")}
            disabled={gen.all || gen.situation || gen.concept}
            className="btn btn-blue"
            style={{ width: "100%", justifyContent: "center", fontSize: "0.82rem", opacity: (gen.all || gen.situation || gen.concept) ? 0.6 : 1 }}
          >
            {gen.all ? "Generating…" : "Generate All Sections"}
          </button>

          {/* Download placeholder */}
          <button
            disabled
            className="btn btn-outline"
            style={{ width: "100%", justifyContent: "center", fontSize: "0.82rem", opacity: 0.5 }}
          >
            Download Brief
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
          background: "#1d1d1f", color: "white", padding: "10px 18px",
          borderRadius: 8, fontSize: "0.85rem", fontWeight: 500, zIndex: 200,
          boxShadow: "0 4px 20px rgba(0,0,0,.2)", whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Channel row ────────────────────────────────────────────────────────────────

function ChannelRow({ ch, onChange }: { ch: ChannelRec; onChange: (c: ChannelRec) => void }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid #f0f0f5", alignItems: "flex-start" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 6, background: ch.recommended ? "#34c759" : "#d2d2d7" }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <p style={{ fontWeight: 600, fontSize: "0.85rem", color: "#1d1d1f" }}>{ch.channelLabel}</p>
          <button
            onClick={() => onChange({ ...ch, recommended: !ch.recommended })}
            style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 10, border: "none", cursor: "pointer", background: ch.recommended ? "rgba(52,199,89,0.12)" : "#f5f5f7", color: ch.recommended ? "#248a3d" : "#86868b" }}
          >
            {ch.recommended ? "Recommended" : "Optional"}
          </button>
        </div>
        <p style={{ fontSize: "0.78rem", color: "#6e6e73", lineHeight: 1.5, marginBottom: ch.recommended ? 4 : 0 }}>{ch.rationale}</p>
        {ch.recommended && <p style={{ fontSize: "0.75rem", color: "#0071e3" }}>{ch.suggestedFormat}</p>}
      </div>
    </div>
  );
}

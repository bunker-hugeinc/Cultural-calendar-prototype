"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const QUARTERS = ["FQ1 2026", "FQ2 2026", "FQ3 2026", "FQ4 2026", "FQ1 2027", "FQ2 2027", "FQ3 2027", "FQ4 2027"];

function getAppleFQ(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month >= 10) return `FQ1 ${year + 1}`;
  if (month <= 3)  return `FQ2 ${year}`;
  if (month <= 6)  return `FQ3 ${year}`;
  return `FQ4 ${year}`;
}

interface MomentOpt { id: string; name: string; startDate: string; category: string; }
interface MerchantOpt { id: string; name: string; category: string; }

function NewPitchForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const presetMomentId = searchParams.get("momentId");
  const presetMerchantId = searchParams.get("merchantId");
  const presetMerchantIds = searchParams.get("merchantIds")?.split(",").filter(Boolean) ?? [];
  const presetMomentIds = searchParams.get("momentIds")?.split(",").filter(Boolean) ?? [];

  const [allMoments, setAllMoments] = useState<MomentOpt[]>([]);
  const [allMerchants, setAllMerchants] = useState<MerchantOpt[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<"moment_led" | "merchant_led">(presetMomentId ? "moment_led" : presetMerchantId ? "merchant_led" : "moment_led");
  const [momentId, setMomentId] = useState(presetMomentId ?? "");
  const [merchantId, setMerchantId] = useState(presetMerchantId ?? "");
  const [quarter, setQuarter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/moments").then(r => r.json()),
      fetch("/api/merchants").then(r => r.json()),
    ]).then(([m, mr]) => {
      setAllMoments(Array.isArray(m) ? m : []);
      setAllMerchants(Array.isArray(mr) ? mr : []);
    }).finally(() => setLoading(false));
  }, []);

  // Auto-generate title from moment+merchant selection
  useEffect(() => {
    if (title) return;
    const m = allMoments.find(m => m.id === momentId);
    const mr = allMerchants.find(m => m.id === merchantId);
    if (m && mr) setTitle(`${mr.name} × ${m.name}`);
    else if (m) setTitle(m.name);
    else if (mr) setTitle(mr.name);
  }, [momentId, merchantId, allMoments, allMerchants, title]);

  // Auto-populate target quarter from moment start date
  useEffect(() => {
    if (quarter) return;
    const m = allMoments.find(m => m.id === momentId);
    if (m?.startDate) setQuarter(getAppleFQ(m.startDate));
  }, [momentId, allMoments, quarter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Please enter a pitch title."); return; }
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/pitches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        type,
        momentId: momentId || undefined,
        merchantId: merchantId || undefined,
        merchantIds: presetMerchantIds.length ? presetMerchantIds : undefined,
        momentIds: presetMomentIds.length ? presetMomentIds : undefined,
        targetQuarter: quarter || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed to create pitch"); setSubmitting(false); return; }
    router.push(`/pitches/${data.id}`);
  }

  const presetMoment = allMoments.find(m => m.id === presetMomentId);
  const presetMerchant = allMerchants.find(m => m.id === presetMerchantId);

  return (
    <div style={{ padding: "40px 24px", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/pitches" style={{ fontSize: "0.82rem", color: "#86868b", textDecoration: "none" }}>← Pitches</Link>
      </div>

      <p className="eyebrow" style={{ marginBottom: 8, marginTop: 16 }}>PITCH BUILDER</p>
      <h1 style={{ marginBottom: 32 }}>Create New Pitch</h1>

      {loading ? (
        <p style={{ color: "#86868b", fontSize: "0.85rem" }}>Loading…</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Title */}
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>PITCH TITLE</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Adidas × FIFA World Cup 2026"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #d2d2d7", fontSize: "0.95rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Type */}
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>STARTING FROM</label>
            <div style={{ display: "flex", gap: 10 }}>
              {(["moment_led", "merchant_led"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  style={{
                    padding: "8px 16px", borderRadius: 10, fontSize: "0.85rem", fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                    border: type === t ? "2px solid #1d1d1f" : "2px solid #d2d2d7",
                    background: type === t ? "#1d1d1f" : "white",
                    color: type === t ? "white" : "#1d1d1f",
                  }}
                >
                  {t === "moment_led" ? "A Moment" : "A Merchant"}
                </button>
              ))}
            </div>
          </div>

          {/* Primary moment */}
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>PRIMARY MOMENT</label>
            {presetMoment ? (
              <div style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #d2d2d7", background: "#f5f5f7", fontSize: "0.9rem", color: "#1d1d1f" }}>
                {presetMoment.name} <span style={{ color: "#86868b", fontSize: "0.8rem" }}>{presetMoment.startDate}</span>
              </div>
            ) : (
              <select
                value={momentId}
                onChange={e => setMomentId(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #d2d2d7", fontSize: "0.9rem", fontFamily: "inherit", background: "white", outline: "none", boxSizing: "border-box" }}
              >
                <option value="">— Select a moment (optional) —</option>
                {allMoments.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.startDate})</option>
                ))}
              </select>
            )}
          </div>

          {/* Primary merchant */}
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>PRIMARY MERCHANT</label>
            {presetMerchant ? (
              <div style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #d2d2d7", background: "#f5f5f7", fontSize: "0.9rem", color: "#1d1d1f" }}>
                {presetMerchant.name} <span style={{ color: "#86868b", fontSize: "0.8rem" }}>{presetMerchant.category}</span>
              </div>
            ) : (
              <select
                value={merchantId}
                onChange={e => setMerchantId(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #d2d2d7", fontSize: "0.9rem", fontFamily: "inherit", background: "white", outline: "none", boxSizing: "border-box" }}
              >
                <option value="">— Select a merchant (optional) —</option>
                {allMerchants.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.category})</option>
                ))}
              </select>
            )}
          </div>

          {/* Pre-selected additional merchants from moment detail */}
          {presetMerchantIds.length > 0 && (
            <div>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>ADDITIONAL MERCHANTS</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {presetMerchantIds.map(mid => {
                  const m = allMerchants.find(mr => mr.id === mid);
                  return m ? (
                    <span key={mid} style={{ fontSize: "0.78rem", padding: "3px 10px", borderRadius: 10, background: "#e3f2fd", color: "#0071e3" }}>{m.name}</span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Target quarter */}
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>TARGET QUARTER</label>
            <select
              value={quarter}
              onChange={e => setQuarter(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #d2d2d7", fontSize: "0.9rem", fontFamily: "inherit", background: "white", outline: "none", boxSizing: "border-box" }}
            >
              <option value="">— Select quarter —</option>
              {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
            {quarter && momentId && (
              <p style={{ fontSize: "0.75rem", color: "#86868b", marginTop: 4 }}>
                Auto-populated from moment date · override above if needed
              </p>
            )}
          </div>

          {error && <p style={{ fontSize: "0.85rem", color: "#cc2200" }}>{error}</p>}

          <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Creating…" : "Create Pitch →"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function NewPitchPage() {
  return (
    <Suspense>
      <NewPitchForm />
    </Suspense>
  );
}

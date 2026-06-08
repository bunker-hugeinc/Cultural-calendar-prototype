"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface FeedCandidate {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  category: string;
  score: number;
  headline: string;
  status: string;
}

interface Merchant {
  id: string;
  name: string;
  category: string;
}

const QUARTERS = [
  "FQ1 2027", "FQ2 2027", "FQ3 2027", "FQ4 2027",
  "FQ1 2028", "FQ2 2028", "FQ3 2028", "FQ4 2028",
];

const CAT_COLORS: Record<string, string> = {
  gather:  "bg-blue-100 text-blue-700",
  improve: "bg-purple-100 text-purple-700",
  excite:  "bg-orange-100 text-orange-700",
};

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AddDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [candidate, setCandidate] = useState<FeedCandidate | null>(null);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [lastYearUrl, setLastYearUrl] = useState("");
  const [inspirationUrls, setInspirationUrls] = useState<string[]>([""]);
  const [targetQuarter, setTargetQuarter] = useState("");
  const [selectedMerchants, setSelectedMerchants] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/feed`).then(r => r.json()),
      fetch(`/api/merchants`).then(r => r.json()),
    ]).then(([feedData, merchantData]) => {
      const c = (feedData.candidates ?? feedData).find((x: FeedCandidate) => x.id === id);
      setCandidate(c ?? null);
      setMerchants(merchantData);
      setLoading(false);
    });
  }, [id]);

  function addInspirationUrl() {
    if (inspirationUrls.length < 5) setInspirationUrls(u => [...u, ""]);
  }

  function updateInspirationUrl(i: number, val: string) {
    setInspirationUrls(u => u.map((v, idx) => idx === i ? val : v));
  }

  function removeInspirationUrl(i: number) {
    setInspirationUrls(u => u.filter((_, idx) => idx !== i));
  }

  function toggleMerchant(id: string) {
    setSelectedMerchants(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!campaignName.trim()) { setError("Campaign Name is required."); return; }
    setError(null);
    setSubmitting(true);

    const res = await fetch(`/api/feed/${id}/submit-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignName: campaignName.trim(),
        lastYearCampaignUrl: lastYearUrl.trim() || null,
        inspirationUrls: inspirationUrls.filter(u => u.trim()),
        targetQuarter: targetQuarter || null,
        priorityMerchants: selectedMerchants,
        notes: notes.trim() || null,
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Submission failed.");
      return;
    }

    router.push("/review?submitted=1");
  }

  if (loading) {
    return (
      <div className="px-6 py-8 max-w-3xl mx-auto">
        <p className="text-sm text-apple-gray-400">Loading…</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="px-6 py-8 max-w-3xl mx-auto">
        <p className="text-sm text-apple-gray-400">Candidate not found.</p>
        <Link href="/feed" className="text-sm text-blue-600 hover:underline mt-2 block">← Back to Feed</Link>
      </div>
    );
  }

  const catColor = CAT_COLORS[candidate.category] ?? "bg-gray-100 text-gray-700";
  const dateRange = candidate.endDate && candidate.endDate !== candidate.startDate
    ? `${formatDate(candidate.startDate)} – ${formatDate(candidate.endDate)}`
    : formatDate(candidate.startDate);

  const selectedMerchantObjects = merchants.filter(m => selectedMerchants.includes(m.id));

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      {/* Back */}
      <Link href="/feed" className="text-sm text-apple-gray-400 hover:text-apple-black transition-colors mb-4 block no-underline">
        ← Back to Feed
      </Link>

      {/* Workflow indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: "0.75rem" }}>
        <Link href="/feed" style={{ color: "#86868b", textDecoration: "none" }}>Feed</Link>
        <span style={{ color: "#d2d2d7" }}>→</span>
        <span style={{ fontWeight: 600, color: "#1d1d1f" }}>Add Details</span>
        <span style={{ color: "#d2d2d7" }}>→</span>
        <span style={{ color: "#86868b" }}>Review</span>
        <span style={{ color: "#d2d2d7" }}>→</span>
        <span style={{ color: "#86868b" }}>Calendar</span>
      </div>

      {/* Eyebrow + Header */}
      <div className="mb-8">
        <p className="eyebrow mb-2">Submit for Review</p>
        <div className="flex items-start gap-3 flex-wrap">
          <h1 className="text-3xl font-bold tracking-tight">{candidate.name}</h1>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize mt-1.5 ${catColor}`}>
            {candidate.category}
          </span>
        </div>
        <p className="text-sm text-apple-gray-400 mt-1">{dateRange} · Score {candidate.score}/5</p>
        {candidate.headline && (
          <p className="text-sm text-apple-gray-600 italic mt-2">{candidate.headline}</p>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Campaign Name */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Campaign Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={campaignName}
            onChange={e => setCampaignName(e.target.value)}
            placeholder="What would we call this campaign internally?"
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        {/* Last Year's Campaign URL */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Last Year's Campaign URL</label>
          <input
            type="url"
            value={lastYearUrl}
            onChange={e => setLastYearUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        {/* Inspiration URLs */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Inspiration Campaigns</label>
          <div className="space-y-2">
            {inspirationUrls.map((url, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={e => updateInspirationUrl(i, e.target.value)}
                  placeholder="https://…"
                  className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
                {inspirationUrls.length > 1 && (
                  <button type="button" onClick={() => removeInspirationUrl(i)} className="text-apple-gray-400 hover:text-red-500 text-xs px-2">✕</button>
                )}
              </div>
            ))}
          </div>
          {inspirationUrls.length < 5 && (
            <button type="button" onClick={addInspirationUrl} className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium">
              + Add another URL
            </button>
          )}
        </div>

        {/* Target Quarter */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Target Quarter</label>
          <select
            value={targetQuarter}
            onChange={e => setTargetQuarter(e.target.value)}
            className="rounded-lg border bg-white px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-foreground/20"
          >
            <option value="">— Select —</option>
            {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
          <p className="text-xs text-apple-gray-400 mt-1">Apple FQ: Q1 = Oct–Dec, Q2 = Jan–Mar, Q3 = Apr–Jun, Q4 = Jul–Sep</p>
        </div>

        {/* Priority Merchants */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Priority Merchants</label>

          {/* Selected pills */}
          {selectedMerchantObjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedMerchantObjects.map(m => (
                <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-apple-gray-100 px-2.5 py-0.5 text-xs font-medium">
                  {m.name}
                  <button type="button" onClick={() => toggleMerchant(m.id)} className="hover:text-red-500 ml-0.5">✕</button>
                </span>
              ))}
            </div>
          )}

          <div className="max-h-40 overflow-y-auto rounded-lg border bg-white divide-y text-sm">
            {merchants.map(m => (
              <label key={m.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-apple-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMerchants.includes(m.id)}
                  onChange={() => toggleMerchant(m.id)}
                  className="rounded"
                />
                <span className="font-medium">{m.name}</span>
                <span className="text-apple-gray-400 text-xs">{m.category}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            placeholder="Any additional context for the reviewer…"
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary-apple disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit for Review"}
          </button>
          <Link href="/feed" className="text-sm text-apple-gray-400 hover:text-apple-black transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

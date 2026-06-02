"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface FeedCandidate {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  category: string;
  score: number;
  headline: string;
  body: string;
  why: string;
  hook: string;
  partners: string;
}

interface MomentReview {
  id: string;
  campaignName: string | null;
  lastYearCampaignUrl: string | null;
  inspirationUrls: string | null;
  notes: string | null;
  targetQuarter: string | null;
  priorityMerchants: string | null;
  submittedAt: string;
  status: string;
}

interface ReviewItem {
  candidate: FeedCandidate;
  review: MomentReview | null;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

const CAT_STYLES: Record<string, string> = {
  gather:  "bg-gather/10 text-gather",
  improve: "bg-improve/10 text-improve",
  excite:  "bg-excite/10 text-excite",
};

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

let toastId = 0;

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sendBackId, setSendBackId] = useState<string | null>(null);
  const [sendBackNote, setSendBackNote] = useState("");

  useEffect(() => {
    fetch("/api/review")
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false); });
  }, []);

  function addToast(message: string, type: "success" | "error") {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  async function handleApprove(candidateId: string) {
    setActing(a => ({ ...a, [candidateId]: true }));
    const res = await fetch(`/api/review/${candidateId}/approve`, { method: "POST" });
    setActing(a => ({ ...a, [candidateId]: false }));
    if (res.ok) {
      setItems(prev => prev.filter(i => i.candidate.id !== candidateId));
      addToast("Moment approved and added to the Calendar.", "success");
    } else {
      const data = await res.json();
      addToast(data.error ?? "Approval failed.", "error");
    }
  }

  async function handleSendBack(candidateId: string) {
    setActing(a => ({ ...a, [candidateId]: true }));
    const res = await fetch(`/api/review/${candidateId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewNotes: sendBackNote.trim() || null }),
    });
    setActing(a => ({ ...a, [candidateId]: false }));
    setSendBackId(null);
    setSendBackNote("");
    if (res.ok) {
      setItems(prev => prev.filter(i => i.candidate.id !== candidateId));
      addToast("Sent back to the Feed for revision.", "success");
    } else {
      const data = await res.json();
      addToast(data.error ?? "Send back failed.", "error");
    }
  }

  return (
    <div className="px-6 py-10 max-w-5xl mx-auto">
      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white pointer-events-auto ${
              t.type === "success" ? "bg-apple-green" : "bg-apple-red"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="mb-8">
        <p className="eyebrow mb-1">Review Queue</p>
        <h1>Moment Review</h1>
        <p className="text-sm text-apple-gray-400 mt-1">
          {loading ? "Loading…" : items.length === 0
            ? "No moments pending review."
            : `${items.length} moment${items.length !== 1 ? "s" : ""} awaiting review`}
        </p>
      </div>

      {!loading && items.length === 0 && (
        <div className="card-apple px-6 py-12 text-center">
          <p className="text-sm text-apple-gray-400">
            Nothing to review right now.{" "}
            <Link href="/calendar" className="text-apple-blue">Go to Feed →</Link>
          </p>
        </div>
      )}

      <div className="space-y-5">
        {items.map(({ candidate: c, review: r }) => {
          const catStyle = CAT_STYLES[c.category] ?? "bg-apple-gray-100 text-apple-gray-600";
          const dateRange = c.endDate && c.endDate !== c.startDate
            ? `${formatDate(c.startDate)} – ${formatDate(c.endDate)}`
            : formatDate(c.startDate);
          const partners: string[] = JSON.parse(c.partners ?? "[]");
          const inspirationUrls: string[] = r?.inspirationUrls ? JSON.parse(r.inspirationUrls) : [];
          const isBusy = !!acting[c.id];
          const showSendBack = sendBackId === c.id;

          return (
            <div key={c.id} className="card-apple overflow-hidden">
              {/* Card header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-apple-gray-100 bg-apple-gray-50">
                <span className={`badge-apple capitalize ${catStyle}`}>{c.category}</span>
                <h2 className="font-semibold text-[15px] flex-1 text-apple-black">{c.name}</h2>
                <span className="text-xs text-apple-gray-400">{dateRange}</span>
                <span className="text-xs font-semibold text-apple-gray-600">Score {c.score}/5</span>
              </div>

              {/* Two-column body */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-apple-gray-100">
                {/* Left: moment content */}
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <p className="eyebrow mb-1">Campaign Angle</p>
                    <p className="text-sm font-semibold text-apple-black">{c.headline}</p>
                    <p className="text-sm text-apple-gray-600 mt-1 leading-relaxed">{c.body}</p>
                  </div>
                  <div>
                    <p className="eyebrow mb-1">Why It Fits</p>
                    <p className="text-sm text-apple-gray-600 leading-relaxed">{c.why}</p>
                  </div>
                  {partners.length > 0 && (
                    <div>
                      <p className="eyebrow mb-2">Suggested Partners</p>
                      <div className="flex flex-wrap gap-1.5">
                        {partners.map(p => (
                          <span key={p} className="badge-apple border border-apple-gray-200 text-apple-gray-600 bg-white">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: submitted context */}
                <div className="px-6 py-5 space-y-3">
                  <p className="eyebrow mb-1">Submitted Details</p>
                  {r ? (
                    <>
                      {r.campaignName && (
                        <div>
                          <p className="text-xs text-apple-gray-400">Campaign Name</p>
                          <p className="text-sm font-medium text-apple-black">{r.campaignName}</p>
                        </div>
                      )}
                      {r.targetQuarter && (
                        <div>
                          <p className="text-xs text-apple-gray-400">Target Quarter</p>
                          <p className="text-sm font-medium text-apple-black">{r.targetQuarter}</p>
                        </div>
                      )}
                      {r.lastYearCampaignUrl && (
                        <div>
                          <p className="text-xs text-apple-gray-400">Last Year&apos;s Campaign</p>
                          <a href={r.lastYearCampaignUrl} target="_blank" rel="noreferrer"
                            className="text-sm text-apple-blue break-all">{r.lastYearCampaignUrl}</a>
                        </div>
                      )}
                      {inspirationUrls.length > 0 && (
                        <div>
                          <p className="text-xs text-apple-gray-400">Inspiration</p>
                          <ul className="mt-0.5 space-y-0.5">
                            {inspirationUrls.map((u, i) => (
                              <li key={i}>
                                <a href={u} target="_blank" rel="noreferrer"
                                  className="text-sm text-apple-blue break-all">{u}</a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {r.notes && (
                        <div>
                          <p className="text-xs text-apple-gray-400">Notes</p>
                          <p className="text-sm text-apple-gray-600">{r.notes}</p>
                        </div>
                      )}
                      <p className="text-xs text-apple-gray-400 pt-1">
                        Submitted {new Date(r.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-apple-gray-400 italic">No details submitted.</p>
                  )}
                </div>
              </div>

              {/* Send back notes input */}
              {showSendBack && (
                <div className="px-6 py-4 border-t border-apple-amber/20 bg-apple-amber/5">
                  <p className="text-xs font-medium text-apple-amber mb-2">Optional: add feedback for the submitter</p>
                  <textarea
                    value={sendBackNote}
                    onChange={e => setSendBackNote(e.target.value)}
                    rows={2}
                    placeholder="What needs to be revised? (optional)"
                    className="w-full rounded-xl border border-apple-gray-200 bg-white px-3 py-2 text-sm text-apple-black focus:outline-none focus:border-apple-blue resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleSendBack(c.id)}
                      disabled={isBusy}
                      className="rounded-full bg-apple-amber text-white px-4 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
                    >
                      {isBusy ? "Sending…" : "Confirm Send Back"}
                    </button>
                    <button
                      onClick={() => { setSendBackId(null); setSendBackNote(""); }}
                      className="btn-outline-apple"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex items-center gap-3 px-6 py-4 border-t border-apple-gray-100 bg-apple-gray-50">
                <button
                  onClick={() => handleApprove(c.id)}
                  disabled={isBusy || showSendBack}
                  className="rounded-full bg-apple-green text-white px-5 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
                >
                  {isBusy && !showSendBack ? "Approving…" : "Approve → Add to Calendar"}
                </button>
                {!showSendBack && (
                  <button
                    onClick={() => setSendBackId(c.id)}
                    disabled={isBusy}
                    className="btn-outline-apple disabled:opacity-50"
                  >
                    Send Back
                  </button>
                )}
                <div className="flex-1" />
                <Link
                  href={`/feed/${c.id}/add-details`}
                  className="text-xs text-apple-gray-400 hover:text-apple-black transition-colors no-underline"
                >
                  Edit Details
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

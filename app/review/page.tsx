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

const CAT_COLORS: Record<string, string> = {
  gather:  "bg-blue-100 text-blue-700",
  improve: "bg-purple-100 text-purple-700",
  excite:  "bg-orange-100 text-orange-700",
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
    <div className="px-6 py-8 max-w-5xl mx-auto">
      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white pointer-events-auto transition-all ${
              t.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Review Queue</p>
        <h1 className="text-3xl font-bold tracking-tight">Moment Review</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loading ? "Loading…" : items.length === 0
            ? "No moments pending review."
            : `${items.length} moment${items.length !== 1 ? "s" : ""} awaiting review`}
        </p>
      </div>

      {!loading && items.length === 0 && (
        <div className="rounded-xl border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
          Nothing to review right now.{" "}
          <Link href="/calendar" className="text-blue-600 hover:underline">Go to Feed →</Link>
        </div>
      )}

      <div className="space-y-6">
        {items.map(({ candidate: c, review: r }) => {
          const catColor = CAT_COLORS[c.category] ?? "bg-gray-100 text-gray-700";
          const dateRange = c.endDate && c.endDate !== c.startDate
            ? `${formatDate(c.startDate)} – ${formatDate(c.endDate)}`
            : formatDate(c.startDate);
          const partners: string[] = JSON.parse(c.partners ?? "[]");
          const inspirationUrls: string[] = r?.inspirationUrls ? JSON.parse(r.inspirationUrls) : [];
          const isBusy = !!acting[c.id];
          const showSendBack = sendBackId === c.id;

          return (
            <div key={c.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b bg-muted/20">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${catColor}`}>
                  {c.category}
                </span>
                <h2 className="font-semibold text-base flex-1">{c.name}</h2>
                <span className="text-xs text-muted-foreground">{dateRange}</span>
                <span className="text-xs font-medium text-foreground/70">Score {c.score}/5</span>
              </div>

              {/* Body */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                {/* Left: moment content */}
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Campaign Angle</p>
                    <p className="text-sm font-medium">{c.headline}</p>
                    <p className="text-sm text-foreground/70 mt-1">{c.body}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Why It Fits</p>
                    <p className="text-sm text-foreground/70">{c.why}</p>
                  </div>
                  {partners.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Suggested Partners</p>
                      <div className="flex flex-wrap gap-1.5">
                        {partners.map(p => (
                          <span key={p} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: submitted context */}
                <div className="px-6 py-5 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Submitted Details</p>
                  {r ? (
                    <>
                      {r.campaignName && (
                        <div>
                          <p className="text-xs text-muted-foreground">Campaign Name</p>
                          <p className="text-sm font-medium">{r.campaignName}</p>
                        </div>
                      )}
                      {r.targetQuarter && (
                        <div>
                          <p className="text-xs text-muted-foreground">Target Quarter</p>
                          <p className="text-sm font-medium">{r.targetQuarter}</p>
                        </div>
                      )}
                      {r.lastYearCampaignUrl && (
                        <div>
                          <p className="text-xs text-muted-foreground">Last Year's Campaign</p>
                          <a href={r.lastYearCampaignUrl} target="_blank" rel="noreferrer"
                            className="text-sm text-blue-600 hover:underline break-all">{r.lastYearCampaignUrl}</a>
                        </div>
                      )}
                      {inspirationUrls.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground">Inspiration</p>
                          <ul className="mt-0.5 space-y-0.5">
                            {inspirationUrls.map((u, i) => (
                              <li key={i}>
                                <a href={u} target="_blank" rel="noreferrer"
                                  className="text-sm text-blue-600 hover:underline break-all">{u}</a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {r.notes && (
                        <div>
                          <p className="text-xs text-muted-foreground">Notes</p>
                          <p className="text-sm text-foreground/80">{r.notes}</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground pt-1">
                        Submitted {new Date(r.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No details submitted.</p>
                  )}
                </div>
              </div>

              {/* Send Back notes input (inline expand) */}
              {showSendBack && (
                <div className="px-6 py-4 border-t bg-amber-50">
                  <p className="text-xs font-medium text-amber-800 mb-2">Optional: add feedback for the submitter</p>
                  <textarea
                    value={sendBackNote}
                    onChange={e => setSendBackNote(e.target.value)}
                    rows={2}
                    placeholder="What needs to be revised? (optional)"
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleSendBack(c.id)}
                      disabled={isBusy}
                      className="rounded-lg bg-amber-500 text-white px-4 py-1.5 text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
                    >
                      {isBusy ? "Sending…" : "Confirm Send Back"}
                    </button>
                    <button
                      onClick={() => { setSendBackId(null); setSendBackNote(""); }}
                      className="rounded-lg border px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex items-center gap-3 px-6 py-4 border-t bg-muted/10">
                <button
                  onClick={() => handleApprove(c.id)}
                  disabled={isBusy || showSendBack}
                  className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isBusy && !showSendBack ? "Approving…" : "Approve → Add to Calendar"}
                </button>
                {!showSendBack && (
                  <button
                    onClick={() => setSendBackId(c.id)}
                    disabled={isBusy}
                    className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors"
                  >
                    Send Back
                  </button>
                )}
                <div className="flex-1" />
                <Link
                  href={`/feed/${c.id}/add-details`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
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

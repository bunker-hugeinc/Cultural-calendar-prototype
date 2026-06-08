"use client";

import { useState, useEffect } from "react";
import { ProactiveFeed, type FeedCandidate } from "@/components/proactive-feed";
import Link from "next/link";

export default function FeedPage() {
  const [candidates, setCandidates] = useState<FeedCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/feed")
      .then(r => r.json())
      .then((rows: FeedCandidate[]) => {
        setCandidates(Array.isArray(rows) ? rows : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function onApprove(_id: string, _name: string): Promise<void> {
    // Approval flows through Add Details → submit-review → Review queue → approve
  }

  async function onDismiss(id: string): Promise<void> {
    await fetch(`/api/feed/${id}/dismiss`, { method: "POST" });
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: "dismissed" } : c));
  }

  async function onRestore(id: string): Promise<void> {
    await fetch(`/api/feed/${id}/restore`, { method: "POST" });
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: "pending" } : c));
  }

  function onDiscovered(newCandidates: FeedCandidate[]): void {
    setCandidates(prev => {
      const existingIds = new Set(prev.map(c => c.id));
      const fresh = newCandidates.filter(c => !existingIds.has(c.id));
      return [...fresh, ...prev];
    });
  }

  const inReview = candidates.filter(c => c.status === "in_review");

  if (loading) {
    return (
      <div style={{ padding: "40px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <p style={{ color: "#86868b", fontSize: "0.85rem" }}>Loading feed…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <ProactiveFeed
        candidates={candidates.filter(c => c.status !== "in_review")}
        onApprove={onApprove}
        onDismiss={onDismiss}
        onRestore={onRestore}
        onDiscovered={onDiscovered}
      />

      {/* In Review section (Fix 5D) */}
      {inReview.length > 0 && (
        <div style={{ marginTop: 40, borderTop: "1px solid #e8e8ed", paddingTop: 24 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>In Review ({inReview.length})</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {inReview.map(c => (
              <div key={c.id} className="card" style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <span className={`pill pill-${c.category}`} style={{ textTransform: "capitalize" }}>{c.category}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "#1d1d1f" }}>{c.name}</p>
                  <p style={{ fontSize: "0.75rem", color: "#86868b", marginTop: 2 }}>
                    Submitted for review. Check the Review queue.
                  </p>
                </div>
                <span className="pill pill-review">In Review</span>
                <Link href="/review" className="btn btn-outline btn-sm" style={{ textDecoration: "none" }}>
                  View in Review →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

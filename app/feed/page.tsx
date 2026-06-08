"use client";

import { useState, useEffect, useCallback } from "react";
import { ProactiveFeed, type FeedCandidate } from "@/components/proactive-feed";

export default function FeedPage() {
  const [candidates, setCandidates] = useState<FeedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    try {
      const r = await fetch("/api/feed");
      const rows: FeedCandidate[] = await r.json();
      setCandidates(Array.isArray(rows) ? rows : []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadFeed().finally(() => setLoading(false));
  }, [loadFeed]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function onApprove(id: string, name: string): Promise<void> {
    const res = await fetch(`/api/feed/${id}/approve`, { method: "POST" });
    if (res.ok) {
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: "added" } : c));
      showToast(`✓ ${name} added to your calendar.`);
    }
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
        candidates={candidates}
        onApprove={onApprove}
        onDismiss={onDismiss}
        onRestore={onRestore}
        onDiscovered={onDiscovered}
      />

      {toast && (
        <div style={{
          position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
          background: "#1d1d1f", color: "#fff", padding: "10px 18px", borderRadius: 8,
          fontSize: "0.85rem", fontWeight: 500, zIndex: 200,
          boxShadow: "0 4px 20px rgba(0,0,0,.2)", whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

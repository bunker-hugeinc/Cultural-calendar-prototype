"use client";

import { useState, useCallback } from "react";
import { GanttChart, type MomentData } from "./gantt-chart";
import { ProactiveFeed, type FeedCandidate } from "./proactive-feed";

const SANS = `-apple-system,"SF Pro Text",BlinkMacSystemFont,sans-serif`;

interface CalendarViewProps {
  initialMoments: MomentData[];
  initialFeed: FeedCandidate[];
}

export function CalendarView({ initialMoments, initialFeed }: CalendarViewProps) {
  const [moments, setMoments] = useState<MomentData[]>(initialMoments);
  const [feed, setFeed]       = useState<FeedCandidate[]>(initialFeed);
  const [toast, setToast]     = useState<{ message: string; visible: boolean }>({ message: "", visible: false });

  function showToast(msg: string) {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
  }

  const handleApprove = useCallback(async (candidateId: string, candidateName: string) => {
    const res = await fetch(`/api/feed/${candidateId}/approve`, { method: "POST" });
    if (!res.ok) return;
    const { momentId } = await res.json();

    // Optimistically add to Gantt
    const candidate = feed.find(c => c.id === candidateId);
    if (candidate) {
      setMoments(prev => [...prev, {
        id: momentId,
        name: candidate.name,
        startDate: candidate.startDate,
        endDate: candidate.endDate,
        category: candidate.category,
      }]);
    }

    // Update feed status
    setFeed(prev => prev.map(c => c.id === candidateId ? { ...c, status: "added" } : c));
    showToast(`${candidateName} added to calendar`);
  }, [feed]);

  const handleDismiss = useCallback(async (candidateId: string) => {
    const res = await fetch(`/api/feed/${candidateId}/dismiss`, { method: "POST" });
    if (!res.ok) return;
    setFeed(prev => prev.map(c => c.id === candidateId ? { ...c, status: "dismissed" } : c));
  }, []);

  const handleDiscovered = useCallback((newCandidates: FeedCandidate[]) => {
    setFeed(prev => [...newCandidates, ...prev]);
  }, []);

  return (
    <>
      <GanttChart moments={moments} />

      <div style={{ height: 56 }} />

      <ProactiveFeed
        candidates={feed}
        onApprove={handleApprove}
        onDismiss={handleDismiss}
        onDiscovered={handleDiscovered}
      />

      {/* Toast */}
      <div style={{
        position: "fixed", bottom: 32, left: "50%", transform: `translateX(-50%) translateY(${toast.visible ? 0 : 12}px)`,
        background: "#15803d", color: "#fff", padding: "10px 18px", borderRadius: 8,
        fontFamily: SANS, fontSize: 13, fontWeight: 500, zIndex: 200,
        display: "flex", alignItems: "center", gap: 8,
        boxShadow: "0 4px 20px rgba(0,0,0,.2)",
        opacity: toast.visible ? 1 : 0,
        pointerEvents: toast.visible ? "auto" : "none",
        transition: "opacity .2s, transform .2s",
        whiteSpace: "nowrap",
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7l3.5 3.5L12 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {toast.message}
      </div>
    </>
  );
}

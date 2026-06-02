"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SubScoreCardProps {
  momentId: string;
  audienceRelevance: number | null;
  productConnection: number | null;
  partnerAlignment: number | null;
}

function scoreColor(score: number | null): string {
  if (score == null) return "bg-gray-200";
  if (score >= 7) return "bg-green-500";
  if (score >= 4) return "bg-amber-400";
  return "bg-red-400";
}

function ScoreBar({ score }: { score: number | null }) {
  const pct = score != null ? Math.min(100, (score / 10) * 100) : 0;
  return (
    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${scoreColor(score)}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function SubScoreCard({ momentId, audienceRelevance, productConnection, partnerAlignment }: SubScoreCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ar, setAr] = useState(audienceRelevance?.toString() ?? "");
  const [pc, setPc] = useState(productConnection?.toString() ?? "");
  const [pa, setPa] = useState(partnerAlignment?.toString() ?? "");

  const hasScores = audienceRelevance != null && productConnection != null && partnerAlignment != null;
  const overall = hasScores
    ? parseFloat(((audienceRelevance! + productConnection! + partnerAlignment!) / 3).toFixed(1))
    : null;

  async function save() {
    setSaving(true);
    await fetch(`/api/moments/${momentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audienceRelevance: ar !== "" ? parseFloat(ar) : null,
        productConnection: pc !== "" ? parseFloat(pc) : null,
        partnerAlignment: pa !== "" ? parseFloat(pa) : null,
      }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  const rows: { label: string; abbr: string; score: number | null; val: string; set: (v: string) => void }[] = [
    { label: "Audience Relevance", abbr: "AR", score: audienceRelevance, val: ar, set: setAr },
    { label: "Product Connection", abbr: "PC", score: productConnection, val: pc, set: setPc },
    { label: "Partner Alignment",  abbr: "PA", score: partnerAlignment,  val: pa, set: setPa },
  ];

  return (
    <div className="rounded-xl border bg-white p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sub-scores</p>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
        >
          {hasScores ? "Edit" : "+ Add sub-scores"}
        </button>
      </div>

      {!hasScores && !editing ? (
        <p className="text-xs text-muted-foreground italic">No sub-scores set yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(({ label, score }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-36 shrink-0">{label}</span>
              <ScoreBar score={score} />
              <span className={`text-xs font-semibold w-8 text-right ${score == null ? "text-muted-foreground" : score >= 7 ? "text-green-700" : score >= 4 ? "text-amber-600" : "text-red-500"}`}>
                {score != null ? score.toFixed(1) : "—"}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-1 border-t mt-1">
            <span className="text-xs font-semibold w-36 shrink-0">Overall</span>
            <ScoreBar score={overall} />
            <span className={`text-xs font-bold w-8 text-right ${overall == null ? "text-muted-foreground" : overall >= 7 ? "text-green-700" : overall >= 4 ? "text-amber-600" : "text-red-500"}`}>
              {overall != null ? overall.toFixed(1) : "—"}
            </span>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 space-y-4">
            <h3 className="font-semibold text-sm">Edit Sub-scores (0–10)</h3>
            {rows.map(({ label, val, set }) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <label className="text-sm text-muted-foreground flex-1">{label}</label>
                <input
                  type="number"
                  min={0} max={10} step={0.1}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  className="w-20 rounded border px-2 py-1 text-sm text-right"
                  placeholder="—"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-lg bg-foreground text-background px-3 py-2 text-sm font-medium hover:bg-foreground/80 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => { setEditing(false); setAr(audienceRelevance?.toString() ?? ""); setPc(productConnection?.toString() ?? ""); setPa(partnerAlignment?.toString() ?? ""); }}
                className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

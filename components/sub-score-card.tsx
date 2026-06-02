"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SubScoreCardProps {
  momentId: string;
  audienceRelevance: number | null;
  productConnection: number | null;
  partnerAlignment: number | null;
}

function barColor(score: number | null): string {
  if (score == null) return "bg-apple-gray-200";
  if (score >= 7) return "bg-apple-green";
  if (score >= 4) return "bg-apple-amber";
  return "bg-apple-red";
}

function textColor(score: number | null): string {
  if (score == null) return "text-apple-gray-400";
  if (score >= 7) return "text-apple-green";
  if (score >= 4) return "text-apple-amber";
  return "text-apple-red";
}

function ScoreBar({ score }: { score: number | null }) {
  const pct = score != null ? Math.min(100, (score / 10) * 100) : 0;
  return (
    <div className="flex-1 h-1.5 rounded-full bg-apple-gray-100 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${barColor(score)}`}
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

  const rows: { label: string; score: number | null; val: string; set: (v: string) => void }[] = [
    { label: "Audience Relevance", score: audienceRelevance, val: ar, set: setAr },
    { label: "Product Connection",  score: productConnection,  val: pc, set: setPc },
    { label: "Partner Alignment",   score: partnerAlignment,   val: pa, set: setPa },
  ];

  return (
    <div className="card-apple p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="eyebrow">Sub-scores</p>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-apple-blue hover:opacity-80 transition-opacity"
        >
          {hasScores ? "Edit" : "+ Add scores"}
        </button>
      </div>

      {!hasScores && !editing ? (
        <p className="text-xs text-apple-gray-400 italic">No sub-scores set yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map(({ label, score }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-apple-gray-400 w-36 shrink-0">{label}</span>
              <ScoreBar score={score} />
              <span className={`text-xs font-semibold w-8 text-right tabular-nums ${textColor(score)}`}>
                {score != null ? score.toFixed(1) : "—"}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-3 border-t border-apple-gray-100">
            <span className="text-xs font-semibold text-apple-black w-36 shrink-0">Overall</span>
            <ScoreBar score={overall} />
            <span className={`text-xs font-bold w-8 text-right tabular-nums ${textColor(overall)}`}>
              {overall != null ? overall.toFixed(1) : "—"}
            </span>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 space-y-4">
            <h3 className="font-semibold text-[15px] text-apple-black">Edit Sub-scores</h3>
            <p className="eyebrow -mt-2">0 – 10</p>
            {rows.map(({ label, val, set }) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <label className="text-sm text-apple-gray-600 flex-1">{label}</label>
                <input
                  type="number"
                  min={0} max={10} step={0.1}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  className="w-20 rounded-lg border border-apple-gray-200 px-2 py-1.5 text-sm text-right text-apple-black focus:outline-none focus:border-apple-blue"
                  placeholder="—"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="btn-primary-apple flex-1 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setAr(audienceRelevance?.toString() ?? "");
                  setPc(productConnection?.toString() ?? "");
                  setPa(partnerAlignment?.toString() ?? "");
                }}
                className="btn-outline-apple flex-1"
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

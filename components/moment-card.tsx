import Link from "next/link";
import { ScoreBadge } from "@/components/score-badge";

interface Pairing {
  merchantName: string;
  relevanceScore: number;
}

interface MomentCardProps {
  id: string;
  name: string;
  startDate: string;
  endDate?: string | null;
  category: string;
  daysAway: number;
  topPairings: Pairing[];
  audienceRelevance?: number | null;
  productConnection?: number | null;
  partnerAlignment?: number | null;
}

const CATEGORY_STYLES: Record<string, { pill: string; dot: string }> = {
  gather:  { pill: "bg-gather/10 text-gather",   dot: "bg-gather"  },
  improve: { pill: "bg-improve/10 text-improve",  dot: "bg-improve" },
  excite:  { pill: "bg-excite/10 text-excite",    dot: "bg-excite"  },
};

function subScoreColor(score: number): string {
  if (score >= 7) return "text-apple-green";
  if (score >= 4) return "text-apple-amber";
  return "text-apple-red";
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MomentCard({
  id, name, startDate, endDate, category, daysAway, topPairings,
  audienceRelevance, productConnection, partnerAlignment,
}: MomentCardProps) {
  const style = CATEGORY_STYLES[category] ?? { pill: "bg-apple-gray-100 text-apple-gray-600", dot: "bg-apple-gray-400" };

  const daysLabel =
    daysAway === 0 ? "Today"
    : daysAway === 1 ? "Tomorrow"
    : daysAway < 0 ? `${Math.abs(daysAway)}d ago`
    : `${daysAway}d away`;

  const hasSubScores = audienceRelevance != null && productConnection != null && partnerAlignment != null;

  return (
    <Link href={`/moments/${id}`} className="block group no-underline">
      <div className="card-apple p-5 h-full flex flex-col gap-3 hover:shadow-md transition-shadow">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-[15px] leading-snug text-apple-black group-hover:text-apple-blue transition-colors">
            {name}
          </h3>
          <span className={`shrink-0 badge-apple capitalize ${style.pill}`}>
            {category}
          </span>
        </div>

        {/* Date / countdown */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-apple-gray-400">
            {formatDate(startDate)}{endDate && endDate !== startDate ? ` – ${formatDate(endDate)}` : ""}
          </span>
          <span className="text-xs font-medium text-apple-gray-600">{daysLabel}</span>
        </div>

        {/* Sub-score mini pills */}
        {hasSubScores && (
          <div className="flex items-center gap-2">
            {([
              { abbr: "AR", score: audienceRelevance! },
              { abbr: "PC", score: productConnection! },
              { abbr: "PA", score: partnerAlignment! },
            ] as const).map(({ abbr, score }) => (
              <span key={abbr} className="inline-flex items-center gap-0.5 text-xs">
                <span className="text-apple-gray-400 font-medium">{abbr}:</span>
                <span className={`font-semibold tabular-nums ${subScoreColor(score)}`}>{score.toFixed(1)}</span>
              </span>
            ))}
          </div>
        )}

        {/* Pairings */}
        <div className="mt-auto pt-3 border-t border-apple-gray-100 flex flex-col gap-2">
          {topPairings.length === 0 ? (
            <p className="text-xs text-apple-gray-400">No pairings yet</p>
          ) : (
            topPairings.map((p) => (
              <div key={p.merchantName} className="flex items-center justify-between">
                <span className="text-xs text-apple-gray-600 truncate">{p.merchantName}</span>
                <ScoreBadge score={p.relevanceScore} />
              </div>
            ))
          )}
        </div>
      </div>
    </Link>
  );
}

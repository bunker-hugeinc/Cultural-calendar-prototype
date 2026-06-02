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

const CATEGORY_COLORS: Record<string, string> = {
  gather: "bg-blue-100 text-blue-700",
  improve: "bg-purple-100 text-purple-700",
  excite: "bg-orange-100 text-orange-700",
};

function scorePillColor(score: number): string {
  if (score >= 7) return "bg-green-100 text-green-700";
  if (score >= 4) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-500";
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MomentCard({ id, name, startDate, endDate, category, daysAway, topPairings, audienceRelevance, productConnection, partnerAlignment }: MomentCardProps) {
  const categoryColor = CATEGORY_COLORS[category] ?? "bg-gray-100 text-gray-700";
  const daysLabel =
    daysAway === 0
      ? "Today"
      : daysAway === 1
      ? "Tomorrow"
      : daysAway < 0
      ? `${Math.abs(daysAway)}d ago`
      : `${daysAway}d away`;

  const hasSubScores = audienceRelevance != null && productConnection != null && partnerAlignment != null;

  return (
    <Link href={`/moments/${id}`} className="block group">
      <div className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-snug group-hover:text-blue-600 transition-colors">{name}</h3>
          <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${categoryColor}`}>
            {category}
          </span>
        </div>

        {/* Date */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatDate(startDate)}{endDate && endDate !== startDate ? ` – ${formatDate(endDate)}` : ""}</span>
          <span className="font-medium text-foreground/70">{daysLabel}</span>
        </div>

        {/* Sub-score mini pills */}
        {hasSubScores && (
          <div className="flex items-center gap-1.5">
            {([
              { abbr: "AR", score: audienceRelevance! },
              { abbr: "PC", score: productConnection! },
              { abbr: "PA", score: partnerAlignment! },
            ] as const).map(({ abbr, score }) => (
              <span key={abbr} className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium ${scorePillColor(score)}`}>
                <span className="opacity-60">{abbr}:</span> {score.toFixed(1)}
              </span>
            ))}
          </div>
        )}

        {/* Pairings */}
        <div className="mt-auto pt-2 border-t flex flex-col gap-1.5">
          {topPairings.length === 0 ? (
            <p className="text-xs text-muted-foreground">No pairings yet</p>
          ) : (
            topPairings.map((p) => (
              <div key={p.merchantName} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate">{p.merchantName}</span>
                <ScoreBadge score={p.relevanceScore} />
              </div>
            ))
          )}
        </div>
      </div>
    </Link>
  );
}

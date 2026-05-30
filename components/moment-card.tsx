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
}

const CATEGORY_COLORS: Record<string, string> = {
  gather: "bg-blue-100 text-blue-700",
  improve: "bg-purple-100 text-purple-700",
  excite: "bg-orange-100 text-orange-700",
};

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MomentCard({ id, name, startDate, endDate, category, daysAway, topPairings }: MomentCardProps) {
  const categoryColor = CATEGORY_COLORS[category] ?? "bg-gray-100 text-gray-700";
  const daysLabel =
    daysAway === 0
      ? "Today"
      : daysAway === 1
      ? "Tomorrow"
      : daysAway < 0
      ? `${Math.abs(daysAway)}d ago`
      : `${daysAway}d away`;

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

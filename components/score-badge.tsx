interface ScoreBadgeProps {
  score: number;
  className?: string;
}

export function ScoreBadge({ score, className = "" }: ScoreBadgeProps) {
  const color =
    score >= 7
      ? "bg-green-100 text-green-800"
      : score >= 4
      ? "bg-amber-100 text-amber-800"
      : "bg-red-100 text-red-800";

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color} ${className}`}>
      {score.toFixed(1)}
    </span>
  );
}

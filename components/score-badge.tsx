interface ScoreBadgeProps {
  score: number;
  className?: string;
}

export function ScoreBadge({ score, className = "" }: ScoreBadgeProps) {
  const color =
    score >= 7
      ? "text-apple-green"
      : score >= 4
      ? "text-apple-amber"
      : "text-apple-red";

  return (
    <span className={`inline-flex items-center text-xs font-semibold tabular-nums ${color} ${className}`}>
      {score.toFixed(1)}
    </span>
  );
}

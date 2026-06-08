import Link from "next/link";
import { ScoreBar } from "@/components/score-bar";
import { CATEGORY_PILL } from "@/lib/category-colors";

interface MomentCardProps {
  id: string;
  name: string;
  startDate: string;
  endDate?: string | null;
  category: string;
  daysAway: number;
  score?: number | null;
  audienceRelevance?: number | null;
  productConnection?: number | null;
  partnerAlignment?: number | null;
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function MomentCard({
  id, name, startDate, endDate, category, daysAway, score,
  audienceRelevance, productConnection, partnerAlignment,
}: MomentCardProps) {
  const pillClass = CATEGORY_PILL[category] ?? "pill";

  // Derive overall score from sub-scores when score field is null
  const displayScore = score ?? (
    audienceRelevance != null && productConnection != null && partnerAlignment != null
      ? (audienceRelevance + productConnection + partnerAlignment) / 3
      : null
  );

  const daysLabel =
    daysAway === 0 ? "Today"
    : daysAway < 0 ? `${Math.abs(daysAway)}d ago`
    : `In ${daysAway}d`;

  return (
    <Link href={`/moments/${id}`} style={{ textDecoration: "none", display: "block", height: "100%" }}>
      <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ padding: "18px 20px 14px" }}>
          {/* Top row: category pill + days-away badge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span className={pillClass} style={{ textTransform: "capitalize" }}>{category}</span>
            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: daysAway <= 30 ? "#0071e3" : "#86868b" }}>
              {daysLabel}
            </span>
          </div>

          {/* Name */}
          <h3 style={{ marginBottom: 4, lineHeight: 1.25 }}>{name}</h3>

          {/* Date */}
          <p style={{ fontSize: "0.8rem", color: "#86868b", marginBottom: 12 }}>
            {formatDate(startDate)}{endDate && endDate !== startDate ? ` – ${formatDate(endDate)}` : ""}
          </p>

          {/* Score bars */}
          {displayScore != null && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <ScoreBar label="Overall fit" value={displayScore} max={10} />
              {audienceRelevance != null && <ScoreBar label="Audience" value={audienceRelevance} max={10} />}
              {productConnection != null && <ScoreBar label="Product" value={productConnection} max={10} />}
              {partnerAlignment  != null && <ScoreBar label="Partners" value={partnerAlignment}  max={10} />}
            </div>
          )}
        </div>

        {/* Card footer */}
        <div style={{ borderTop: "1px solid #f0f0f5", padding: "12px 20px", marginTop: "auto" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "#0071e3" }}>
            View moment →
          </span>
        </div>
      </div>
    </Link>
  );
}

import Link from "next/link";

const APPLE_PAY_NON_ACCEPTORS = ["amazon", "amazon prime", "walmart.com"];
const ALWAYS_EXCLUDE = ["apple", "apple inc", "apple store", "apple.com"];

function isBlockedMerchant(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    APPLE_PAY_NON_ACCEPTORS.some(b => lower.includes(b)) ||
    ALWAYS_EXCLUDE.some(ex => lower === ex || lower.startsWith("apple "))
  );
}

interface MerchantCardProps {
  id: string;
  name: string;
  category: string;
  highRelevanceCount: number;
  partnerStatus?: string;
  partnerGroup?: string | null;
}

const STATUS_STYLES: Record<string, { pill: string; label: string }> = {
  existing:  { pill: "bg-apple-gray-100 text-apple-gray-600 border border-apple-gray-200",       label: "Partner" },
  potential: { pill: "bg-apple-blue/10 text-apple-blue border border-apple-blue/20",             label: "Potential" },
  in_review: { pill: "bg-apple-amber/10 text-apple-amber border border-apple-amber/20",          label: "In Review" },
  approved:  { pill: "bg-apple-green/10 text-apple-green border border-apple-green/20",          label: "Approved" },
  dismissed: { pill: "bg-apple-red/10 text-apple-red border border-apple-red/20",                label: "Dismissed" },
};

export function MerchantCard({ id, name, category, highRelevanceCount, partnerStatus, partnerGroup }: MerchantCardProps) {
  const status = partnerStatus ?? "existing";
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.existing;
  const blocked = isBlockedMerchant(name);

  return (
    <Link href={`/merchants/${id}`} className="block group no-underline">
      <div className="card-apple p-5 h-full flex flex-col gap-3 hover:shadow-md transition-shadow">
        {/* Name + status badge */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-[15px] leading-snug text-apple-black group-hover:text-apple-blue transition-colors">
            {name}
          </h3>
          <span className={`shrink-0 badge-apple text-[10px] ${statusStyle.pill}`}>
            {statusStyle.label}
          </span>
        </div>
        {blocked && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 self-start">
            Apple Pay not accepted
          </span>
        )}

        {/* Group / category */}
        <p className="text-xs text-apple-gray-400">
          {partnerGroup ? `${partnerGroup} · ${category}` : category}
        </p>

        {/* High-relevance count */}
        <div className="mt-auto pt-3 border-t border-apple-gray-100 text-xs">
          {highRelevanceCount > 0 ? (
            <span className="text-apple-gray-600">
              <span className="font-semibold text-apple-green">{highRelevanceCount}</span>
              {" "}high-relevance moment{highRelevanceCount !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="text-apple-gray-400">No high-relevance moments</span>
          )}
        </div>
      </div>
    </Link>
  );
}

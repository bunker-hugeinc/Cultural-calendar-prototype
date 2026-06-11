"use client";

export function CacheFooter({
  fromCache,
  generatedAt,
  onRegenerate,
  isRegenerating = false,
}: {
  fromCache: boolean;
  generatedAt: string | Date | null;
  onRegenerate: () => void;
  isRegenerating?: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-400">
      <span>
        {fromCache && generatedAt
          ? `Generated ${new Date(generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
          : "Just generated"}
      </span>
      <button
        onClick={onRegenerate}
        disabled={isRegenerating}
        className="text-blue-500 hover:underline disabled:opacity-50"
      >
        {isRegenerating ? "Regenerating…" : "↺ Regenerate"}
      </button>
    </div>
  );
}

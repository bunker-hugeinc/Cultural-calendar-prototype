"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function MerchantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="px-6 py-24 max-w-xl mx-auto text-center">
      <p className="text-lg font-medium mb-2">Something went wrong</p>
      <p className="text-sm text-muted-foreground mb-6">
        This merchant couldn't be loaded. It may have been deleted or the connection failed.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:bg-foreground/80 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/merchants"
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Back to Merchants
        </Link>
      </div>
    </div>
  );
}

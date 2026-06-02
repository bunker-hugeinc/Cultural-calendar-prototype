"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function MomentError({
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
      <p className="text-sm text-apple-gray-400 mb-6">
        This moment couldn't be loaded. It may have been deleted or the connection failed.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="btn-primary-apple"
        >
          Try again
        </button>
        <Link
          href="/"
          className="btn-outline-apple"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

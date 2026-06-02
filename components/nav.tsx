"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function Nav() {
  const pathname = usePathname();
  const [reviewCount, setReviewCount] = useState<number>(0);

  useEffect(() => {
    fetch("/api/review")
      .then(r => r.json())
      .then((items: unknown[]) => setReviewCount(items.length))
      .catch(() => {});
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const navLink = (href: string, label: React.ReactNode) => (
    <Link
      href={href}
      className={`relative text-sm font-medium transition-colors flex items-center gap-1.5 ${
        isActive(href)
          ? "text-apple-black"
          : "text-apple-gray-400 hover:text-apple-black"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-apple-gray-100">
      <div className="max-w-7xl mx-auto px-6 h-12 flex items-center gap-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 mr-4 no-underline">
          <span className="text-sm font-semibold text-apple-black tracking-tight">
            Apple Pay
          </span>
          <span className="text-apple-gray-200 select-none">·</span>
          <span className="text-sm text-apple-gray-400 tracking-tight">
            Partner Marketing
          </span>
        </Link>

        {/* Nav links */}
        {navLink("/", "Dashboard")}
        {navLink("/calendar", "Calendar")}
        {navLink("/merchants", "Merchants")}
        {navLink("/review",
          <>
            Review
            {reviewCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-apple-amber text-white text-[10px] font-bold min-w-[16px] h-4 px-1 leading-none">
                {reviewCount}
              </span>
            )}
          </>
        )}
      </div>
    </nav>
  );
}

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
      className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
        isActive(href) && (href !== "/" || !isActive("/merchants") && !isActive("/calendar") && !isActive("/review"))
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="border-b px-6 py-3 flex items-center gap-6">
      <span className="font-semibold text-sm tracking-tight">Cultural Calendar</span>
      {navLink("/", "Dashboard")}
      {navLink("/calendar", "Calendar")}
      {navLink("/merchants", "Merchants")}
      {navLink("/review",
        <>
          Review
          {reviewCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 leading-none">
              {reviewCount}
            </span>
          )}
        </>
      )}
    </nav>
  );
}

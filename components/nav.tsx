"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${
        isActive(href) && (href !== "/" || !isActive("/merchants") && !isActive("/calendar"))
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
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const pathname = usePathname();
  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const navLinks = [
    { href: "/",          label: "Dashboard" },
    { href: "/calendar",  label: "Calendar"  },
    { href: "/merchants", label: "Merchants" },
    { href: "/pitches",   label: "Pitches"   },
    { href: "/pitch",     label: "AI Pitches" },
    { href: "/feed",      label: "Feed"      },
  ];

  return (
    <nav style={{
      background: "rgba(255,255,255,0.85)",
      backdropFilter: "blur(20px)",
      borderBottom: "1px solid #e8e8ed",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", gap: 0 }}>
        {/* Wordmark */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "baseline", gap: 6, marginRight: 40 }}>
          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.01em" }}>Apple Pay</span>
          <span style={{ fontSize: "0.85rem", color: "#86868b", fontWeight: 400 }}>Partner Marketing</span>
        </Link>

        {/* Nav links */}
        {navLinks.map(({ href, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                fontSize: "0.85rem", fontWeight: 500,
                color: active ? "#1d1d1f" : "#86868b",
                padding: "0 12px", height: 52,
                display: "flex", alignItems: "center",
                borderBottom: active ? "2px solid #1d1d1f" : "2px solid transparent",
                transition: "all 0.15s",
                textDecoration: "none",
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

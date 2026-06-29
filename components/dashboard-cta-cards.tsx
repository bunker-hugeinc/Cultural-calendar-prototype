"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

function CTACard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "16px 18px",
        textDecoration: "none",
        borderRadius: 12,
        border: hovered ? "1px solid #b3d4fb" : "1px solid #e8e8ed",
        background: hovered ? "rgba(0,113,227,0.03)" : "white",
        boxShadow: hovered ? "0 2px 12px rgba(0,113,227,0.10)" : "none",
        transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
        cursor: "pointer",
      }}
    >
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1d1d1f", display: "block" }}>
          {title}
        </span>
        <span style={{ fontSize: "0.78rem", color: "#86868b", lineHeight: 1.5 }}>
          {description}
        </span>
      </div>
      <ChevronRight
        style={{
          width: 18,
          height: 18,
          color: hovered ? "#0071e3" : "#d2d2d7",
          flexShrink: 0,
          transition: "color 0.15s",
        }}
      />
    </Link>
  );
}

export function DashboardCTACards() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, maxWidth: 520 }}>
      <CTACard
        href="/feed"
        title="Start with a moment"
        description="Browse cultural moments and find the best merchant partners"
      />
      <CTACard
        href="/merchants"
        title="Start with a merchant"
        description="Find the best moment opportunities for a specific partner"
      />
    </div>
  );
}

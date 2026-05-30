"use client";

import { useState, useEffect, useRef } from "react";
import type { FeedCandidate } from "./proactive-feed";

const MONO = `"SF Pro Mono","SFMono-Regular",ui-monospace,monospace`;
const SANS = `-apple-system,"SF Pro Text",BlinkMacSystemFont,sans-serif`;
const DISP = `"SF Pro Display",-apple-system,BlinkMacSystemFont,sans-serif`;

const LS_KEY = "cultural-calendar-feed-settings";

type TimeWindow = "3m" | "6m" | "12m" | "custom";
type Category   = "gather" | "improve" | "excite";

interface FeedSettings {
  timeWindow: TimeWindow;
  customStart: string;
  customEnd: string;
  categories: Category[];
  priorityMerchants: string[];
  minScore: number;
}

const DEFAULT_SETTINGS: FeedSettings = {
  timeWindow: "12m",
  customStart: "",
  customEnd: "",
  categories: ["gather", "improve", "excite"],
  minScore: 3.5,
  priorityMerchants: [],
};

interface Merchant { id: string; name: string; category: string; }

interface FeedSettingsPanelProps {
  onDiscovered: (candidates: FeedCandidate[]) => void;
}

// ── Merchant multi-select ────────────────────────────────────────────────────
function MerchantSelect({
  merchants,
  selected,
  onChange,
}: {
  merchants: Merchant[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const filtered = merchants.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) && !selected.includes(m.name)
  );

  function add(name: string) {
    if (selected.length >= 10) return;
    onChange([...selected, name]);
    setSearch("");
  }
  function remove(name: string) { onChange(selected.filter(s => s !== name)); }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Selected pills */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 5, minHeight: 36,
        padding: "5px 8px", border: "1px solid rgba(0,0,0,.12)", borderRadius: 8,
        background: "#fff", cursor: "text",
      }} onClick={() => setOpen(true)}>
        {selected.map(name => (
          <span key={name} style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "2px 8px 2px 10px", borderRadius: 20,
            background: "rgba(37,99,235,.1)", border: "1px solid rgba(37,99,235,.25)",
            fontFamily: SANS, fontSize: 11, color: "#1a3fa8",
          }}>
            {name}
            <button onClick={e => { e.stopPropagation(); remove(name); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#1a3fa8", lineHeight: 1, fontSize: 13 }}>
              ×
            </button>
          </span>
        ))}
        {selected.length === 0 && (
          <span style={{ fontFamily: SANS, fontSize: 12, color: "#b0b0ba", lineHeight: "22px" }}>
            All merchants (no priority set)
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          zIndex: 60, background: "#fff", border: "1px solid rgba(0,0,0,.1)",
          borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.12)", overflow: "hidden",
        }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(0,0,0,.06)" }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search merchants…"
              style={{
                width: "100%", border: "none", outline: "none", fontFamily: SANS,
                fontSize: 12, color: "#111", background: "transparent",
              }}
            />
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "10px 12px", fontFamily: SANS, fontSize: 12, color: "#b0b0ba" }}>
                {search ? "No matches" : "All merchants selected"}
              </div>
            ) : (
              filtered.map(m => (
                <button key={m.id} onClick={() => add(m.name)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "8px 12px", border: "none", background: "transparent",
                    cursor: "pointer", fontFamily: SANS, fontSize: 12, color: "#111", textAlign: "left",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span>{m.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: "#b0b0ba", letterSpacing: ".08em" }}>
                    {m.category}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function FeedSettingsPanel({ onDiscovered }: FeedSettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<FeedSettings>(DEFAULT_SETTINGS);
  const [merchantList, setMerchantList] = useState<Merchant[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load settings from localStorage + fetch merchants on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setSettings(JSON.parse(saved));
    } catch { /* ignore */ }

    fetch("/api/merchants")
      .then(r => r.json())
      .then((rows: Merchant[]) => setMerchantList(rows))
      .catch(() => {});
  }, []);

  function update<K extends keyof FeedSettings>(key: K, value: FeedSettings[K]) {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  function toggleCategory(cat: Category) {
    const cats = settings.categories.includes(cat)
      ? settings.categories.filter(c => c !== cat)
      : [...settings.categories, cat];
    if (cats.length === 0) return; // require at least one
    update("categories", cats);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    setError(null);
    setResultMsg(null);
    try {
      const res = await fetch("/api/feed/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Discovery failed");
      } else {
        const count = data.candidates?.length ?? 0;
        onDiscovered(data.candidates ?? []);
        setResultMsg(`${count} new moment${count !== 1 ? "s" : ""} added to your queue`);
        setTimeout(() => setResultMsg(null), 5000);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setRegenerating(false);
    }
  }

  const TIME_OPTIONS: { value: TimeWindow; label: string }[] = [
    { value: "3m",     label: "Next 3 months" },
    { value: "6m",     label: "Next 6 months" },
    { value: "12m",    label: "Next 12 months" },
    { value: "custom", label: "Custom range" },
  ];

  const CAT_OPTIONS: { value: Category; label: string; color: string }[] = [
    { value: "gather",  label: "Gather",  color: "#1a6b2e" },
    { value: "improve", label: "Improve", color: "#9c2050" },
    { value: "excite",  label: "Excite",  color: "#1a3fa8" },
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Toggle row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: open ? 16 : 0 }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            fontFamily: MONO, fontSize: 9, fontWeight: 500, letterSpacing: ".14em", textTransform: "uppercase",
            padding: "7px 14px", borderRadius: 8,
            border: open ? "1px solid rgba(0,0,0,.15)" : "1px solid rgba(0,0,0,.1)",
            background: open ? "#f5f5f7" : "#fff",
            color: "#6e6e80", cursor: "pointer", transition: "all .15s",
          }}
        >
          {/* Gear icon */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Feed Settings
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none"
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
            <path d="M1.5 3L4 5.5L6.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Expanded panel */}
      {open && (
        <div style={{
          background: "#fff", border: "1px solid rgba(0,0,0,.1)", borderRadius: 12,
          padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24,
        }}>
          {/* Time window */}
          <div>
            <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 500, letterSpacing: ".2em", textTransform: "uppercase", color: "#b0b0ba", marginBottom: 10 }}>
              Time Window
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {TIME_OPTIONS.map(opt => {
                const active = settings.timeWindow === opt.value;
                return (
                  <label key={opt.value} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="timeWindow"
                      value={opt.value}
                      checked={active}
                      onChange={() => update("timeWindow", opt.value)}
                      style={{ accentColor: "#111" }}
                    />
                    <span style={{ fontFamily: SANS, fontSize: 13, color: active ? "#111" : "#6e6e80" }}>
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </div>
            {settings.timeWindow === "custom" && (
              <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center" }}>
                <input
                  type="date"
                  value={settings.customStart}
                  onChange={e => update("customStart", e.target.value)}
                  style={{ fontFamily: SANS, fontSize: 12, padding: "6px 10px", border: "1px solid rgba(0,0,0,.12)", borderRadius: 6, color: "#111" }}
                />
                <span style={{ fontFamily: SANS, fontSize: 12, color: "#b0b0ba" }}>to</span>
                <input
                  type="date"
                  value={settings.customEnd}
                  onChange={e => update("customEnd", e.target.value)}
                  style={{ fontFamily: SANS, fontSize: 12, padding: "6px 10px", border: "1px solid rgba(0,0,0,.12)", borderRadius: 6, color: "#111" }}
                />
              </div>
            )}
          </div>

          {/* Category mix */}
          <div>
            <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 500, letterSpacing: ".2em", textTransform: "uppercase", color: "#b0b0ba", marginBottom: 10 }}>
              Category Mix
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {CAT_OPTIONS.map(opt => {
                const checked = settings.categories.includes(opt.value);
                return (
                  <label key={opt.value} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(opt.value)}
                      style={{ accentColor: opt.color, width: 14, height: 14 }}
                    />
                    <span style={{ fontFamily: SANS, fontSize: 13, color: checked ? opt.color : "#b0b0ba", fontWeight: checked ? 500 : 400, transition: "color .15s" }}>
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Priority merchants */}
          <div>
            <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 500, letterSpacing: ".2em", textTransform: "uppercase", color: "#b0b0ba", marginBottom: 10 }}>
              Priority Merchants <span style={{ fontWeight: 400, letterSpacing: ".06em", textTransform: "none", fontSize: 9 }}>(up to 10)</span>
            </div>
            <MerchantSelect
              merchants={merchantList}
              selected={settings.priorityMerchants}
              onChange={v => update("priorityMerchants", v)}
            />
          </div>

          {/* Min fit score */}
          <div>
            <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 500, letterSpacing: ".2em", textTransform: "uppercase", color: "#b0b0ba", marginBottom: 10 }}>
              Minimum Fit Score
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <input
                type="range"
                min={0} max={5} step={0.5}
                value={settings.minScore}
                onChange={e => update("minScore", parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: "#111", maxWidth: 280 }}
              />
              <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: "#111", minWidth: 36 }}>
                {settings.minScore.toFixed(1)}
              </span>
              <span style={{ fontFamily: SANS, fontSize: 12, color: "#6e6e80" }}>
                / 5.0
              </span>
            </div>
            <p style={{ fontFamily: SANS, fontSize: 11, color: "#b0b0ba", marginTop: 4 }}>
              Only suggest moments with a fit score of {settings.minScore.toFixed(1)} or above
            </p>
          </div>

          {/* Regenerate button + feedback */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 4, borderTop: "1px solid rgba(0,0,0,.06)" }}>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              style={{
                fontFamily: MONO, fontSize: 9, fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase",
                padding: "10px 20px", borderRadius: 8,
                border: "1px solid rgba(37,99,235,.4)",
                background: regenerating ? "rgba(37,99,235,.06)" : "rgba(37,99,235,.1)",
                color: "#1a3fa8", cursor: regenerating ? "default" : "pointer",
                opacity: regenerating ? 0.65 : 1, transition: "all .15s",
                display: "inline-flex", alignItems: "center", gap: 8,
              }}
            >
              {regenerating ? (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ animation: "spin .8s linear infinite" }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Regenerating…
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                  Regenerate Feed
                </>
              )}
            </button>

            {resultMsg && (
              <span style={{ fontFamily: SANS, fontSize: 12, color: "#15803d", display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7l3.5 3.5L12 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {resultMsg}
              </span>
            )}
            {error && (
              <span style={{ fontFamily: SANS, fontSize: 12, color: "#dc2626" }}>{error}</span>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

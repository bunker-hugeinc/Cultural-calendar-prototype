export function ScoreBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = (value / max) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.72rem" }}>
      <span style={{ color: "#86868b", width: 80, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#e8e8ed", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#0071e3", borderRadius: 2 }} />
      </div>
      <span style={{ color: "#1d1d1f", fontWeight: 600, width: 28, textAlign: "right" }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

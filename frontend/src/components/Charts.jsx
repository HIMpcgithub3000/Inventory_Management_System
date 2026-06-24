// Dependency-free SVG charts tuned for the data-dense dashboard style.

const TONE_HEX = {
  emerald: "#059669",
  amber: "#f59e0b",
  rose: "#e11d48",
  slate: "#94a3b8",
  indigo: "#6366f1",
};

// Donut with a centered total. segments: [{ label, value, tone }]
export function Donut({ segments, total, centerLabel = "Total", size = 168, stroke = 18 }) {
  const sum = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef1f4" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const len = (s.value / sum) * c;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={TONE_HEX[s.tone] || TONE_HEX.slate}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          );
          offset += len;
          return el;
        })}
        <text x="50%" y="46%" className="rotate-90" textAnchor="middle" style={{ transformOrigin: "center" }} fontSize="26" fontWeight="700" fill="#0f172a" fontFamily="Fira Code">
          {total ?? sum}
        </text>
        <text x="50%" y="60%" className="rotate-90" textAnchor="middle" style={{ transformOrigin: "center" }} fontSize="10" fill="#94a3b8" fontFamily="Fira Sans">
          {centerLabel}
        </text>
      </svg>
      <ul className="space-y-2.5">
        {segments.map((s, i) => (
          <li key={i} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: TONE_HEX[s.tone] || TONE_HEX.slate }} />
            <span className="text-brand-500">{s.label}</span>
            <span className="tnum ml-auto font-semibold text-brand-800">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Horizontal bar list. items: [{ label, value, tone, sub }]
export function BarList({ items, max }) {
  const peak = max || Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={i}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium text-brand-700">{it.label}</span>
            <span className="tnum shrink-0 text-brand-500">
              {it.value}
              {it.sub && <span className="ml-1 text-brand-300">{it.sub}</span>}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-brand-100">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(it.value / peak) * 100}%`, background: TONE_HEX[it.tone] || TONE_HEX.slate }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

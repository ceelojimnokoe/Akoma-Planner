// src/components/guests/RsvpPieChart.tsx
//
// RSVP breakdown as a donut chart. Unlike the dashboard's progress rings,
// this genuinely is part-to-whole categorical data (three distinct RSVP
// states), so per the dataviz skill it gets real pie-chart treatment —
// but colored with STATUS tokens (accepted = good, pending = warning,
// declined = serious), not arbitrary categorical hues, since these are
// literally status values. Same green/gold/terracotta convention
// GuestRow's badges already use, so the two views never disagree.
// A legend is always shown (required once there are 2+ series) with the
// actual counts, so nothing is locked behind hover-only interaction.

const SIZE = 120;
const STROKE_WIDTH = 20;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP_PX = 3; // "surface gap" between slices, per the dataviz skill's mark spec

interface Segment {
  label: string;
  value: number;
  color: string;
}

export function RsvpPieChart({ confirmed, pending, declined }: { confirmed: number; pending: number; declined: number }) {
  const total = confirmed + pending + declined;

  const segments: Segment[] = [
    { label: "Confirmed", value: confirmed, color: "#0B6E4F" }, // status: good
    { label: "Pending", value: pending, color: "#D4A017" }, // status: warning
    { label: "Declined", value: declined, color: "#C1502E" }, // status: serious
  ];

  if (total === 0) {
    return <p className="text-sm text-akoma-ink/50">No guests yet — add some to see the RSVP breakdown.</p>;
  }

  let cumulative = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Guest RSVP breakdown">
        {segments.map((seg) => {
          if (seg.value === 0) return null;
          const rawLength = (seg.value / total) * CIRCUMFERENCE;
          const length = Math.max(0, rawLength - GAP_PX);
          const offset = -cumulative;
          cumulative += rawLength;
          return (
            <circle
              key={seg.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              // A plain attribute, not an SVG <title> child element — the
              // latter caused a real React hydration mismatch (SVG/HTML
              // tag-name collision on <title>, likely a browser-parser
              // quirk), and the legend below already shows every count as
              // plain text, so a hover tooltip is a bonus, not a requirement.
              aria-label={`${seg.label}: ${seg.value} (${Math.round((seg.value / total) * 100)}%)`}
            />
          );
        })}
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-akoma-ink" style={{ fontSize: 20, fontWeight: 600 }}>
          {total}
        </text>
      </svg>

      {/* Legend — required for 2+ series; counts here so the info isn't hover-only */}
      <ul className="space-y-1.5 text-sm">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-akoma-ink/70">{seg.label}</span>
            <span className="font-medium text-akoma-ink">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

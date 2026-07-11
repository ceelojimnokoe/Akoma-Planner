// src/components/dashboard/GuestProgressCard.tsx
//
// Same SVG stroke-dasharray donut construction as RsvpPieChart.tsx, kept
// visually consistent on purpose, simplified to two segments: confirmed
// attendees (real headcount — see lib/guests.ts, a +1 counts as 2) vs.
// however many of the couple's own guestEstimate are still unconfirmed.
// Center label is the confirmed count, not the total — that's the number
// this card is actually about.

const SIZE = 120;
const STROKE_WIDTH = 20;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP_PX = 3;

import { Card } from "@/components/ui/Card";

export function GuestProgressCard({ confirmedAttendees, guestEstimate }: { confirmedAttendees: number; guestEstimate: number }) {
  const remaining = Math.max(0, guestEstimate - confirmedAttendees);
  const over = Math.max(0, confirmedAttendees - guestEstimate);
  const total = confirmedAttendees + remaining;

  const segments = [
    { label: "Confirmed", value: confirmedAttendees, color: "#0B6E4F" },
    { label: "Remaining", value: remaining, color: "#D8D3C8" },
  ];

  let cumulative = 0;

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-akoma-ink">Guests confirmed</h2>
      <div className="flex items-center gap-6">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Confirmed guests vs. estimate">
          {total === 0 ? (
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#D8D3C8" strokeWidth={STROKE_WIDTH} />
          ) : (
            segments.map((seg) => {
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
                  aria-label={`${seg.label}: ${seg.value}`}
                />
              );
            })
          )}
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-akoma-ink" style={{ fontSize: 20, fontWeight: 600 }}>
            {confirmedAttendees}
          </text>
        </svg>

        <ul className="space-y-1.5 text-sm">
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: "#0B6E4F" }} />
            <span className="text-akoma-ink/70">Confirmed</span>
            <span className="font-medium text-akoma-ink">{confirmedAttendees}</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: "#D8D3C8" }} />
            <span className="text-akoma-ink/70">Remaining (of {guestEstimate} est.)</span>
            <span className="font-medium text-akoma-ink">{remaining}</span>
          </li>
          {over > 0 && <li className="text-xs text-akoma-terracotta">{over} over your estimate</li>}
        </ul>
      </div>
    </Card>
  );
}

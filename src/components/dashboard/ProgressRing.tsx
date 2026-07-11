// src/components/dashboard/ProgressRing.tsx
//
// A small circular "meter" — used beside the Budget-spent and
// Checklist-progress stats on the dashboard. Per the dataviz skill: a
// single ratio against a limit is a METER, not a two-slice pie — so
// this is one hue for the filled arc, and the SAME hue at low opacity
// for the unfilled track (a "lighter step of the same ramp"), never two
// unrelated colors. `tone` (see lib/budget-tone.ts) lets the fill shift
// green -> gold -> terracotta as a ratio climbs toward/past its limit
// (e.g. budget spent) — the same "accent -> caution -> danger" idea the
// skill describes for meters.

import type { BudgetTone } from "@/lib/budget-tone";

const SIZE = 72;
const STROKE_WIDTH = 8;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TONE_HEX: Record<BudgetTone, string> = {
  green: "#0B6E4F",
  gold: "#D4A017",
  terracotta: "#C1502E",
};

export function ProgressRing({
  percent,
  tone = "green",
}: {
  /** Can exceed 100 (e.g. over budget) — the ring itself caps visually at
   *  100%, but the tone shift plus the number in the center still tell
   *  the true story. */
  percent: number;
  tone?: BudgetTone;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const dashOffset = CIRCUMFERENCE * (1 - clamped / 100);
  const color = TONE_HEX[tone];

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${Math.round(percent)}%`}>
      {/* Track: the same hue as the fill, just faint — "lighter step of the same ramp" */}
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke={color}
        strokeOpacity={0.15}
        strokeWidth={STROKE_WIDTH}
      />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={dashOffset}
        // Start the arc at 12 o'clock instead of SVG's default 3 o'clock.
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-akoma-ink"
        style={{ fontSize: 15, fontWeight: 600 }}
      >
        {Math.round(percent)}%
      </text>
    </svg>
  );
}

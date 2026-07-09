// src/components/dashboard/StatCard.tsx
//
// One number, labelled, in a card. The dashboard's basic building block —
// deliberately dumb (no logic), so all the actual calculation happens in
// the page/lib layer where it can be tested and reused.

import { Card } from "@/components/ui/Card";

export function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <Card>
      <p className="text-sm text-akoma-ink/60">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-akoma-ink">{value}</p>
      {subtext && <p className="mt-1 text-xs text-akoma-ink/50">{subtext}</p>}
    </Card>
  );
}

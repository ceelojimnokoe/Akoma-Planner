// src/components/bisaai/ToolCard.tsx
//
// Visual shell shared by every inline BisaAI tool card: title, one-line
// description, and a Pro badge. Each tool keeps its own input/result
// state and renders it as children — this component only standardizes
// the look, not the data flow (each tool's inputs/outputs are genuinely
// different shapes, so forcing a single generic data-flow abstraction
// would add indirection without saving much code).

import { Card } from "@/components/ui/Card";
import { ProBadge } from "@/components/ui/Badge";

export function ToolCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="mb-1 flex items-center gap-2">
        <h3 className="font-semibold text-akoma-ink">{title}</h3>
        <ProBadge />
      </div>
      <p className="mb-3 text-sm text-akoma-ink/60">{description}</p>
      {children}
    </Card>
  );
}

// src/components/ui/Card.tsx
//
// Plain bordered container used as the base for nearly every content block
// in the app (dashboard tiles, vendor cards, list rows). Deliberately just
// a styled <div> — no internal state or logic.

import clsx from "clsx";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("rounded-xl border border-akoma-ink/10 bg-white p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

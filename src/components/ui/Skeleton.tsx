// src/components/ui/Skeleton.tsx
//
// Shared pulsing placeholder block for route-level loading.tsx skeletons
// (see (app)/*/loading.tsx) — one definition instead of the same few
// lines copy-pasted into every route's loading file.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-akoma-ink/5 ${className}`} />;
}

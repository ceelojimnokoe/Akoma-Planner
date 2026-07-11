// src/app/(app)/vendors/loading.tsx
//
// Same Suspense-boundary convention as dashboard/loading.tsx.

function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-akoma-ink/5 ${className}`} />;
}

export default function VendorsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Block className="h-10 w-48" />
      <Block className="h-12" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Block key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}

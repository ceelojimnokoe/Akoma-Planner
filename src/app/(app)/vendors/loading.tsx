// src/app/(app)/vendors/loading.tsx
//
// Same Suspense-boundary convention as dashboard/loading.tsx.

import { Skeleton } from "@/components/ui/Skeleton";

export default function VendorsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-12" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}

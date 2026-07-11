// src/app/(app)/dashboard/loading.tsx
//
// Next.js automatically wraps page.tsx in a Suspense boundary using this
// file, shown while the Server Component's data fetching (several
// parallel Prisma queries) is in flight. Shape roughly matches the real
// page so the swap-in doesn't jump the layout around.

function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-akoma-ink/5 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Block className="h-10 w-48" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Block className="h-24" />
        <Block className="h-24" />
        <Block className="h-24" />
        <Block className="h-24" />
      </div>
      <Block className="h-40" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Block className="h-64 lg:col-span-2" />
        <Block className="h-64" />
      </div>
    </div>
  );
}

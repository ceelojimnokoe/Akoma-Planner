import { Skeleton } from "@/components/ui/Skeleton";

export default function ChecklistLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-12" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </div>
  );
}

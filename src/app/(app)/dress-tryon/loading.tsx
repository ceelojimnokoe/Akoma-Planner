import { Skeleton } from "@/components/ui/Skeleton";

export default function DressTryOnLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-80" />
    </div>
  );
}

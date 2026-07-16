import { Skeleton } from "@/components/ui/Skeleton";

export default function VendorsCompareLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-80" />
    </div>
  );
}

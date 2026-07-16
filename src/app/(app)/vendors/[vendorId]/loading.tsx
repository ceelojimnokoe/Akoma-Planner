import { Skeleton } from "@/components/ui/Skeleton";

export default function VendorDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-32" />
    </div>
  );
}

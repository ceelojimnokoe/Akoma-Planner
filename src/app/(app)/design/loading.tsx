import { Skeleton } from "@/components/ui/Skeleton";

export default function DesignLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64" />
      <Skeleton className="h-48" />
      <Skeleton className="h-96" />
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-20 rounded-full" />
        <Skeleton className="h-10 w-72 rounded-2xl" />
        <Skeleton className="h-4 w-[520px] max-w-full rounded-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-36 rounded-[28px]" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <Skeleton className="h-[360px] rounded-[30px]" />
        <Skeleton className="h-[360px] rounded-[30px]" />
      </div>
    </div>
  );
}

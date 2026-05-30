import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-9 w-72 rounded-lg mb-4" />
      <div className="rounded-xl border bg-white overflow-hidden">
        <Skeleton className="h-8 w-full rounded-none" />
        <Skeleton className="h-7 w-full rounded-none" />
        <div className="p-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-7 rounded" style={{ width: `${40 + Math.random() * 45}%`, marginLeft: `${Math.random() * 30}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

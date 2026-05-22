import { Skeleton } from "@/components/ui/skeleton";

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border p-5">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center">
      <div className="font-display text-2xl">{title}</div>
      {hint && <div className="mt-2 text-sm text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : "Something went wrong";
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
      {msg}
    </div>
  );
}

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-themed-skeleton ${className}`}
      aria-hidden
    />
  );
}

export function ChartSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-themed bg-themed-panel p-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

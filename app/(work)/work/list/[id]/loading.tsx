export default function ListLoading() {
  return (
    <main className="flex-1 overflow-y-auto">
      {/* Header skeleton */}
      <div className="border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="h-5 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-5 w-20 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
        </div>
        <div className="mt-1.5 h-3 w-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>

      <div className="px-6 py-4">
        {/* Filter bar skeleton */}
        <div className="mb-3 flex items-center gap-2">
          <div className="h-8 flex-1 max-w-xs animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-8 w-40 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-8 w-36 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-900" />
        </div>

        {/* Table header skeleton */}
        <div className="mb-1 flex gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
          <div className="h-3 w-10 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-3 flex-1 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-3 w-28 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-3 w-28 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
        </div>

        {/* Row skeletons */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 border-b border-zinc-100 py-2 dark:border-zinc-900"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="h-3.5 w-3.5 shrink-0 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900" />
            <div
              className="h-4 flex-1 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900"
              style={{ animationDelay: `${i * 60 + 30}ms` }}
            />
            <div className="h-5 w-24 shrink-0 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-4 w-20 shrink-0 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-4 w-20 shrink-0 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-5 w-20 shrink-0 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900" />
          </div>
        ))}

        {/* New task row skeleton */}
        <div className="mt-1 flex items-center gap-2 border-t border-zinc-200 py-2 dark:border-zinc-800">
          <div className="h-3 w-3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-4 w-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
        </div>
      </div>
    </main>
  );
}

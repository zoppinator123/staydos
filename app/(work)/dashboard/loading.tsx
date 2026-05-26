export default function DashboardLoading() {
  return (
    <div className="flex-1 overflow-y-auto">
      <header className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="h-5 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-1 h-3 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/60" />
      </header>

      <div className="px-6 py-6 space-y-4">
        {/* Skeleton metric cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="h-3 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="mt-2 h-7 w-10 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
          ))}
        </div>

        {/* Skeleton chart rows */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-3 h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-[260px] animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

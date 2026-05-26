export default function MyTasksLoading() {
  return (
    <main className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
        <div className="h-5 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-1.5 h-3 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>

      <div className="px-6 py-4">
        {/* Filter bar */}
        <div className="mb-3 flex items-center gap-2">
          <div className="h-8 flex-1 max-w-xs animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-8 w-36 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-900" />
        </div>

        {/* Table header */}
        <div className="mb-1 flex gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
          <div className="h-3 w-10 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-3 flex-1 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-3 w-28 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-3 w-28 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-3 w-28 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
        </div>

        {/* Rows — slightly varied widths for realism */}
        {[1, 0.85, 0.95, 0.7, 0.9, 0.8, 0.6, 0.75].map((w, i) => (
          <div
            key={i}
            className="flex items-center gap-2 border-b border-zinc-100 py-2 dark:border-zinc-900"
          >
            <div className="h-3.5 w-3.5 shrink-0 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900"
              style={{ animationDelay: `${i * 50}ms` }} />
            <div className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900"
              style={{ animationDelay: `${i * 50}ms` }} />
            <div
              className="h-4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900"
              style={{ flex: 1, maxWidth: `${w * 100}%`, animationDelay: `${i * 50 + 20}ms` }}
            />
            <div className="h-5 w-24 shrink-0 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900"
              style={{ animationDelay: `${i * 50}ms` }} />
            <div className="h-4 w-20 shrink-0 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900"
              style={{ animationDelay: `${i * 50}ms` }} />
            <div className="h-4 w-20 shrink-0 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900"
              style={{ animationDelay: `${i * 50}ms` }} />
            <div className="h-5 w-20 shrink-0 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900"
              style={{ animationDelay: `${i * 50}ms` }} />
            <div className="h-4 w-24 shrink-0 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900"
              style={{ animationDelay: `${i * 50}ms` }} />
          </div>
        ))}
      </div>
    </main>
  );
}

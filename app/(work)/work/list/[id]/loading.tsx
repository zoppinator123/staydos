export default function ListLoading() {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
        <div className="h-5 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-2 h-3 w-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>
      <div className="space-y-2 px-6 py-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-900"
            style={{ animationDelay: `${i * 75}ms` }}
          />
        ))}
      </div>
    </main>
  );
}

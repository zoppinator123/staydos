export default function AllTasksLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="border-b border-border px-6 py-4 bg-surface shrink-0 animate-pulse">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="h-5 w-24 rounded bg-muted mb-2" />
            <div className="h-3 w-40 rounded bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-7 w-20 rounded-lg bg-muted" />
            <div className="h-7 w-28 rounded-lg bg-muted" />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <div className="h-8 flex-1 max-w-sm rounded-lg bg-muted" />
          <div className="h-8 w-20 rounded-lg bg-muted" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-4 py-2.5 w-8" />
              {["Title", "Status", "Priority", "Due", "List"].map((col) => (
                <th key={col} className="px-2 py-2.5 text-left">
                  <div className="h-3 w-12 rounded bg-muted animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                <td className="px-4 py-3 w-8">
                  <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                </td>
                <td className="px-2 py-3">
                  <div
                    className="h-4 rounded bg-muted animate-pulse"
                    style={{ width: `${(i % 3 === 0 ? 80 : i % 3 === 1 ? 65 : 90)}%` }}
                  />
                </td>
                <td className="px-2 py-3 hidden sm:table-cell">
                  <div className="h-5 w-20 rounded-pill bg-muted animate-pulse" />
                </td>
                <td className="px-2 py-3 hidden md:table-cell">
                  <div className="h-5 w-14 rounded-pill bg-muted animate-pulse" />
                </td>
                <td className="px-2 py-3 hidden lg:table-cell">
                  <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                </td>
                <td className="px-2 py-3 hidden xl:table-cell">
                  <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-12">
      <div className="text-center space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Dashboard failed to load
        </h2>
        <p className="text-sm text-zinc-500">{error.message}</p>
        <button
          onClick={reset}
          className="mt-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";

export default function ListError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="max-w-md rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
        <p className="font-semibold">Couldn&apos;t load this list</p>
        <p className="mt-1 text-xs">{error.message}</p>
        <button
          onClick={reset}
          className="mt-3 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-red-50 dark:border-red-800 dark:bg-red-950/40 dark:hover:bg-red-950/60"
        >
          Try again
        </button>
      </div>
    </main>
  );
}

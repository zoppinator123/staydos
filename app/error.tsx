"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <div className="flex min-h-screen items-center justify-center bg-white p-6 dark:bg-zinc-950">
      <div className="max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest ? (
          <p className="mt-1 font-mono text-[10px] text-zinc-400">
            digest: {error.digest}
          </p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button
            onClick={reset}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Try again
          </button>
          <a
            href="/work"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

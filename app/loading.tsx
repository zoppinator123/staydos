export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600" />
        Loading…
      </div>
    </div>
  );
}

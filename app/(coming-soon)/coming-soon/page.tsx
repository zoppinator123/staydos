import Link from "next/link";

interface Props {
  searchParams: Promise<{ title?: string }>;
}

export default async function ComingSoonPage({ searchParams }: Props) {
  const { title } = await searchParams;
  const displayTitle = title ?? "This feature";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div
        className="w-full max-w-md rounded-card border border-border bg-surface p-10 text-center shadow-card animate-slide-up"
      >
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-accent"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1 className="mb-2 font-display text-2xl font-bold text-foreground">
          {displayTitle}
        </h1>
        <p className="mb-8 text-sm text-muted-foreground leading-relaxed">
          This section is coming soon. Check back later — {"we're"} building something great.
        </p>

        <Link
          href="/work"
          className="inline-flex items-center gap-2 rounded-pill bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 transition-opacity"
        >
          ← Back to Work
        </Link>
      </div>
    </div>
  );
}

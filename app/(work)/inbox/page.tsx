export default function InboxPage() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-8 text-center shadow-card animate-slide-up">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-accent"
            aria-hidden
          >
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
        </div>
        <h2 className="mb-1 font-display text-lg font-bold text-foreground">Inbox</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Coming soon. Your mentions and agent follow-ups will live here.
        </p>
      </div>
    </div>
  );
}

export default function DealBuilderPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border bg-surface px-6 py-4">
        <h1 className="font-display text-lg font-bold text-foreground">Deal Builder</h1>
      </header>

      <iframe
        src="/deal-builder.html"
        title="Deal Builder"
        className="min-h-screen w-full flex-1 border-0"
      />
    </div>
  );
}

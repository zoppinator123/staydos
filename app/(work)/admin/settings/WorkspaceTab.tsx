"use client";

export function WorkspaceTab() {
  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-6">
      <section className="rounded-card border border-border bg-surface p-6">
        <h2 className="text-base font-semibold text-foreground">Workspace</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          High-level workspace info. Renaming, branding, and integrations live
          here in future updates.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Name
            </p>
            <p className="mt-1 text-sm text-foreground">Staydos</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Plan
            </p>
            <p className="mt-1 text-sm text-foreground">Internal</p>
          </div>
        </div>
      </section>
    </div>
  );
}

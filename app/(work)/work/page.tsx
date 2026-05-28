import { getSpaces, createSpace } from "@/lib/work/actions";

export default async function WorkHomePage() {
  const spaces = await getSpaces();

  if (spaces.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="w-full max-w-md rounded-card border border-border bg-surface p-10 text-center shadow-card animate-slide-up">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7 text-accent"
              aria-hidden
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1 className="mb-2 font-display text-xl font-bold text-foreground">
            Create your first Space
          </h1>
          <p className="mb-8 text-sm text-muted-foreground leading-relaxed">
            Spaces group your projects, lists, and tasks. Start by creating one for your team or a project.
          </p>
          <form
            action={async (fd: FormData) => {
              "use server";
              const name = (fd.get("name") as string)?.trim();
              if (name) await createSpace({ name });
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Marketing, Engineering…"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-ring transition-colors"
            />
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 transition-opacity"
            >
              Create
            </button>
          </form>
        </div>
      </div>
    );
  }

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
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
        <h2 className="mb-1 font-display text-lg font-bold text-foreground">
          Select a list
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose a list from the sidebar to view and manage tasks.
        </p>
      </div>
    </div>
  );
}

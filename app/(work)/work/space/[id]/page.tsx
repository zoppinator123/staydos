import { notFound } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/work/Sidebar";
import { getFolders, getLists, getSpace } from "@/lib/work/actions";
import { SpacePageActions } from "@/components/work/SpacePageActions";

export default async function SpacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getSpace(id);
  if (!space) notFound();
  const [folders, lists] = await Promise.all([getFolders(space.id), getLists({ spaceId: space.id })]);

  return (
    <>
      <Sidebar activeSpaceId={space.id} />
      <main className="flex-1 overflow-y-auto">
        <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: space.color }} />
            <div>
              <h1 className="text-base font-semibold">{space.name}</h1>
              {space.description ? (
                <p className="text-xs text-zinc-500">{space.description}</p>
              ) : null}
            </div>
          </div>
          <SpacePageActions spaceId={space.id} />
        </header>

        <div className="grid grid-cols-1 gap-6 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
          {folders.map((f) => {
            const fl = lists.filter((l) => l.folder_id === f.id);
            return (
              <section
                key={f.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {f.name}
                </h2>
                <ul className="space-y-1">
                  {fl.map((l) => (
                    <li key={l.id}>
                      <Link
                        href={`/work/list/${l.id}`}
                        className="block rounded px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        {l.name}
                      </Link>
                    </li>
                  ))}
                  {fl.length === 0 ? (
                    <li className="px-2 text-xs text-zinc-500">No lists</li>
                  ) : null}
                </ul>
              </section>
            );
          })}
          <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Loose lists
            </h2>
            <ul className="space-y-1">
              {lists
                .filter((l) => !l.folder_id)
                .map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/work/list/${l.id}`}
                      className="block rounded px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      {l.name}
                    </Link>
                  </li>
                ))}
              {lists.filter((l) => !l.folder_id).length === 0 ? (
                <li className="px-2 text-xs text-zinc-500">None</li>
              ) : null}
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}

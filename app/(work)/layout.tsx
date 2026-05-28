import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSpaces, getFolders, getLists } from "@/lib/work/actions";
import { TopBar } from "@/components/shell/TopBar";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { WorkNav } from "@/components/shell/WorkNav";
import { CmdK } from "@/components/shell/CmdK";

export default async function WorkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Load navigation data for the sidebar tree
  const spaces = await getSpaces();

  // Load folders + lists for all spaces in parallel
  const [foldersPerSpace, listsPerSpace] = await Promise.all([
    Promise.all(spaces.map((s) => getFolders(s.id))),
    Promise.all(spaces.map((s) => getLists({ spaceId: s.id }))),
  ]);

  const allFolders = foldersPerSpace.flat();
  const allLists = listsPerSpace.flat();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <TopBar userEmail={user.email} userName={user.name} />

      {/* Body: sidebar + work nav + main */}
      <div className="flex flex-1 overflow-hidden">
        {/* App sidebar — sectioned nav */}
        <AppSidebar />

        {/* Work nav — space/folder/list tree */}
        <WorkNav spaces={spaces} folders={allFolders} lists={allLists} />

        {/* Main content */}
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>

      {/* Cmd+K palette */}
      <CmdK />
    </div>
  );
}

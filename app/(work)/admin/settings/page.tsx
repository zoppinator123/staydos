import { listMembers } from "@/lib/admin/members-actions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";
import { SettingsPageClient } from "./SettingsPageClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const tab = params.tab ?? "general";

  // Only load members on the members tab to keep the other tabs snappy
  let members: Awaited<ReturnType<typeof listMembers>> = [];
  if (tab === "members") {
    try {
      members = await listMembers();
    } catch (err) {
      // Surface the error in the UI rather than crashing the page
      console.error("[settings] listMembers failed", err);
    }
  }

  return (
    <SettingsPageClient
      activeTab={tab}
      currentUser={{ id: user.id, email: user.email, name: user.name }}
      members={members}
    />
  );
}

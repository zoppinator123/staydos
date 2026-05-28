"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Settings, Users, Building2 } from "lucide-react";
import { MembersTab } from "./MembersTab";
import { GeneralTab } from "./GeneralTab";
import { WorkspaceTab } from "./WorkspaceTab";
import type { MemberRow } from "@/lib/admin/members-actions";

interface Props {
  activeTab: string;
  currentUser: { id: string; email: string; name?: string };
  members: MemberRow[];
}

const TABS = [
  { id: "general", label: "General", Icon: Settings },
  { id: "members", label: "Members", Icon: Users },
  { id: "workspace", label: "Workspace", Icon: Building2 },
];

export function SettingsPageClient({ activeTab, currentUser, members }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const tab = useMemo(
    () => (TABS.some((t) => t.id === activeTab) ? activeTab : "general"),
    [activeTab]
  );

  function setTab(id: string) {
    const params = new URLSearchParams(sp.toString());
    if (id === "general") {
      params.delete("tab");
    } else {
      params.set("tab", id);
    }
    const qs = params.toString();
    router.replace(`/admin/settings${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-display font-bold text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your workspace preferences, members, and configuration.
        </p>
      </header>

      {/* Tabs */}
      <nav
        className="flex items-center gap-1 border-b border-border px-4"
        role="tablist"
      >
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={`relative flex items-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors ${
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-t bg-accent" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 overflow-auto p-6">
        {tab === "general" && <GeneralTab currentUser={currentUser} />}
        {tab === "members" && (
          <MembersTab members={members} currentUserId={currentUser.id} />
        )}
        {tab === "workspace" && <WorkspaceTab />}
      </div>
    </div>
  );
}

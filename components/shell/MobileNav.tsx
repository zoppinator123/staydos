"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { SECTIONS, isNavItemActive } from "./navSections";
import { WorkNavTree } from "./WorkNav";
import { useMobileNav } from "./MobileNavContext";
import type { Space, Folder as FolderType, List } from "@/lib/work/types";

interface MobileNavProps {
  spaces: Space[];
  folders: FolderType[];
  lists: List[];
}

export function MobileNav({ spaces, folders, lists }: MobileNavProps) {
  const { open, setOpen } = useMobileNav();
  const pathname = usePathname();

  // Close the drawer whenever the route changes (e.g. after tapping a list).
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <Drawer
      open={open}
      onClose={() => setOpen(false)}
      side="left"
      ariaLabel="Navigation"
      panelClassName="bg-chrome border-chrome-alt2"
    >
      <div className="flex h-full flex-col overflow-y-auto py-3">
        {/* Section links (mirrors AppSidebar) */}
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-3">
            <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-chrome-faint select-none">
              {section.title}
            </p>
            {section.items.map((item) => {
              const active = isNavItemActive(item, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mx-2 flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                    active
                      ? "bg-white/10 text-white font-medium"
                      : "text-chrome-muted hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="shrink-0 text-chrome-faint">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        {/* Work tree */}
        <div className="mt-1 flex flex-1 flex-col border-t border-white/5 pt-2">
          <p className="px-4 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-chrome-faint select-none">
            WORK
          </p>
          <WorkNavTree spaces={spaces} folders={folders} lists={lists} />
        </div>
      </div>
    </Drawer>
  );
}

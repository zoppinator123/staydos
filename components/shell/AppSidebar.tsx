"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  exact?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "The Board", href: "/work", exact: true },
      { label: "My Tasks", href: "/my-tasks" },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { label: "Project Management", href: "/work/tasks" },
      { label: "Properties", href: "/coming-soon?title=Properties" },
      { label: "Onboarding", href: "/coming-soon?title=Onboarding" },
      { label: "Lost Items", href: "/coming-soon?title=Lost+Items" },
    ],
  },
  {
    title: "ADMIN",
    items: [
      { label: "HR", href: "/coming-soon?title=HR" },
      { label: "Settings", href: "/admin/settings" },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  function isActive(item: NavItem): boolean {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <aside
      className="hidden md:flex flex-col w-[240px] shrink-0 overflow-y-auto py-3"
      style={{ background: "rgb(18 20 19)" }}
    >
      {SECTIONS.map((section) => (
        <div key={section.title} className="mb-4">
          <p
            className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 select-none"
          >
            {section.title}
          </p>
          {section.items.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-1.5 text-sm rounded-md mx-2 transition-colors ${
                  active
                    ? "bg-white/10 text-white font-medium"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

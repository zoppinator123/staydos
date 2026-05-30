"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  CheckSquare,
  Briefcase,
  Calculator,
  Users,
  Settings as SettingsIcon,
  LayoutDashboard,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  exact?: boolean;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "The Board", href: "/work", exact: true, icon: <LayoutDashboard size={14} /> },
      { label: "My Tasks", href: "/my-tasks", icon: <CheckSquare size={14} /> },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { label: "Project Management", href: "/work/tasks", icon: <Briefcase size={14} /> },
      { label: "Deal Builder", href: "/deal-builder", icon: <Calculator size={14} /> },
    ],
  },
  {
    title: "ADMIN",
    items: [
      { label: "HR", href: "/coming-soon?title=HR", icon: <Users size={14} /> },
      { label: "Settings", href: "/admin/settings", icon: <SettingsIcon size={14} /> },
    ],
  },
];

const STORAGE_KEY = "staydos:appSidebarCollapsed";

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state after hydration to avoid SSR mismatch
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === "1") setCollapsed(true);
    } catch {}
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  function isActive(item: NavItem): boolean {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  // Render a stable width during SSR; expand/collapse only kicks in after hydration
  const width = hydrated && collapsed ? "w-[52px]" : "w-[200px]";

  return (
    <aside
      className={`hidden md:flex flex-col ${width} shrink-0 overflow-y-auto py-3 transition-[width] duration-150`}
      style={{ background: "rgb(18 20 19)" }}
    >
      {/* Collapse toggle */}
      <div className={`flex ${collapsed ? "justify-center" : "justify-end px-2"} mb-2`}>
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
          className="flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.title} className="mb-4">
          {!collapsed && (
            <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 select-none">
              {section.title}
            </p>
          )}
          {section.items.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={
                  collapsed
                    ? `mx-2 my-0.5 flex h-8 items-center justify-center rounded-md transition-colors ${
                        active
                          ? "bg-white/10 text-white"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`
                    : `mx-2 flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                        active
                          ? "bg-white/10 text-white font-medium"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`
                }
              >
                <span className="shrink-0 text-zinc-500">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

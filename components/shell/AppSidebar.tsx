"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SECTIONS, isNavItemActive, type NavItem } from "./navSections";

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
    return isNavItemActive(item, pathname);
  }

  // Render a stable width during SSR; expand/collapse only kicks in after hydration
  const width = hydrated && collapsed ? "w-[52px]" : "w-[200px]";

  return (
    <aside
      className={`hidden md:flex flex-col ${width} shrink-0 overflow-y-auto py-3 transition-[width] duration-150 bg-chrome-alt`}
    >
      {/* Collapse toggle */}
      <div className={`flex ${collapsed ? "justify-center" : "justify-end px-2"} mb-2`}>
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
          className="flex h-7 w-7 items-center justify-center rounded text-chrome-faint hover:text-chrome-foreground hover:bg-white/5 transition-colors"
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.title} className="mb-4">
          {!collapsed && (
            <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-chrome-faint select-none">
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
                          : "text-chrome-muted hover:text-white hover:bg-white/5"
                      }`
                    : `mx-2 flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                        active
                          ? "bg-white/10 text-white font-medium"
                          : "text-chrome-muted hover:text-white hover:bg-white/5"
                      }`
                }
              >
                <span className="shrink-0 text-chrome-faint">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

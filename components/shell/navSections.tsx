import {
  CheckSquare,
  Briefcase,
  Users,
  Settings as SettingsIcon,
  LayoutDashboard,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  exact?: boolean;
  icon: React.ReactNode;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const SECTIONS: NavSection[] = [
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

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname.startsWith(item.href);
}

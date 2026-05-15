import type { UserRole } from "@/types/auth";

export type NavChild = {
  label: string;
  href: string;
  roles: UserRole[];
};

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
  children?: NavChild[];
};

export const navStructure: NavItem[] = [
  // {
  //   label: "Overview",
  //   href: "/dashboard",
  //   icon: "LayoutDashboard",
  //   roles: ["super_admin", "hr", "employee"],
  // },
  {
    label: "Employee",
    href: "/employee",
    icon: "Users",
    roles: ["super_admin", "hr", "employee"],
    children: [
      {
        label: "All Employees",
        href: "/employee",
        roles: ["super_admin", "hr", "employee"],
      },
      // {
      //   label: "Employee Roles",
      //   href: "/employee/roles",
      //   roles: ["super_admin", "hr"],
      // },
      // { label: "Onboarding / offboarding", href: "/employee/onboarding" },
      // { label: "Profile & documents", href: "/employee/profile" },
      // { label: "Punch in / out", href: "/employee/punch" },
      // { label: "Daily tasks", href: "/employee/tasks" },
      // { label: "Overtime & approvals", href: "/employee/overtime" },
      // { label: "Salary slips", href: "/employee/salary-slips" },
      // { label: "Complaints", href: "/employee/complaints" },
      // { label: "Reports & charts", href: "/employee/reports" },
      // { label: "Monthly attendance", href: "/employee/attendance" },
      // { label: "Leave & festivals", href: "/employee/leave-festival" },
      // { label: "Leave privacy", href: "/employee/privacy" },
    ],
  },
  // {
  //   label: "Leave",
  //   href: "/leave",
  //   icon: "CalendarDays",
  //   roles: ["super_admin", "hr", "employee"],
  //   children: [
  //     { label: "Leave desk", href: "/leave" },
  //     { label: "Approvals & chain", href: "/leave/approvals" },
  //     { label: "Early leave", href: "/leave/early-leave" },
  //     { label: "Working vs on leave", href: "/leave/dashboard" },
  //   ],
  // },
  // {
  //   label: "Notifications",
  //   href: "/notifications",
  //   icon: "Bell",
  //   roles: ["super_admin", "hr", "employee"],
  //   children: [
  //     { label: "Center", href: "/notifications" },
  //     { label: "Announcements", href: "/notifications/announcements" },
  //     { label: "Automation rules", href: "/notifications/rules" },
  //   ],
  // },
  // {
  //   label: "Integrations",
  //   href: "/integrations",
  //   icon: "Plug",
  //   roles: ["super_admin", "hr"],
  //   children: [
  //     { label: "Overview", href: "/integrations" },
  //     { label: "Google Drive", href: "/integrations/google-drive" },
  //     { label: "Slack", href: "/integrations/slack" },
  //     { label: "Media uploads", href: "/integrations/media" },
  //   ],
  // },
  // {
  //   label: "Access control",
  //   href: "/settings/network",
  //   icon: "Shield",
  //   roles: ["super_admin"],
  //   children: [{ label: "LAN / Wi‑Fi restriction", href: "/settings/network" }],
  // },
];

function filterNavChildren(
  children: NavChild[] | undefined,
  role: UserRole,
): NavChild[] | undefined {
  if (!children?.length) return undefined;
  const filtered = children.filter((child) => child.roles.includes(role));
  return filtered.length ? filtered : undefined;
}

export function filterNav(role: UserRole | null): NavItem[] {
  if (!role) return [];

  return navStructure
    .filter((item) => item.roles.includes(role))
    .map((item) => ({
      ...item,
      children: filterNavChildren(item.children, role),
    }))
    .filter((item) => !item.children || item.children.length > 0);
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
  if (role === "super_admin") return true;

  for (const item of navStructure) {
    if (!item.roles.includes(role)) continue;

    if (item.children?.length) {
      for (const child of item.children) {
        if (
          pathname === child.href ||
          pathname.startsWith(`${child.href}/`)
        ) {
          return child.roles.includes(role);
        }
      }
    }

    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.roles.includes(role);
    }
  }

  if (pathname.startsWith("/settings/network")) return false;
  if (pathname.startsWith("/integrations") && role === "employee") return false;
  return true;
}

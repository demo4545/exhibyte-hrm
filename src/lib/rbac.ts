import type { UserRole } from "@/types/auth";
import { ROLES } from "@/app/consts/common";

const { SUPER_ADMIN, HR_MANAGER, EMPLOYEE } = ROLES;

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
  {
    label: "Overview",
    href: "/dashboard",
    icon: "LayoutDashboard",
    roles: [SUPER_ADMIN, HR_MANAGER, EMPLOYEE],
  },
  {
    label: "Employee",
    href: "/employee",
    icon: "Users",
    roles: [SUPER_ADMIN, HR_MANAGER, EMPLOYEE],
    children: [
      {
        label: "All Employees",
        href: "/employee",
        roles: [SUPER_ADMIN, HR_MANAGER, EMPLOYEE],
      },
      { label: "Onboarding / offboarding", href: "/employee/onboarding", roles: [SUPER_ADMIN, HR_MANAGER], },
      { label: "Profile & documents", href: "/employee/profile", roles: [], },
      { label: "Punch in / out", href: "/employee/punch", roles: [], },
      { label: "Daily tasks", href: "/employee/tasks", roles: [], },
      { label: "Overtime & approvals", href: "/employee/overtime", roles: [], },
      { label: "Salary slips", href: "/employee/salary-slips", roles: [], },
      { label: "Complaints", href: "/employee/complaints", roles: [], },
      { label: "Reports & charts", href: "/employee/reports", roles: [], },
      { label: "Monthly attendance", href: "/employee/attendance", roles: [], },
      { label: "Leave & festivals", href: "/employee/leave-festival", roles: [], },
      { label: "Leave privacy", href: "/employee/privacy", roles: [], },
    ],
  },
  {
    label: "Leave",
    href: "/leave",
    icon: "CalendarDays",
    roles: [SUPER_ADMIN, HR_MANAGER, EMPLOYEE],
    children: [
      { roles: [], label: "Leave desk", href: "/leave" },
      { roles: [], label: "Approvals & chain", href: "/leave/approvals" },
      { roles: [], label: "Early leave", href: "/leave/early-leave" },
      { roles: [], label: "Working vs on leave", href: "/leave/dashboard" },
    ],
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: "Bell",
    roles: [SUPER_ADMIN, HR_MANAGER, EMPLOYEE],
    children: [
      { roles: [], label: "Center", href: "/notifications" },
      { roles: [], label: "Announcements", href: "/notifications/announcements" },
      { roles: [], label: "Automation rules", href: "/notifications/rules" },
    ],
  },
  {
    label: "Integrations",
    href: "/integrations",
    icon: "Plug",
    roles: [SUPER_ADMIN, HR_MANAGER, EMPLOYEE],
    children: [
      { roles: [], label: "Overview", href: "/integrations" },
      { roles: [], label: "Google Drive", href: "/integrations/google-drive" },
      { roles: [], label: "Slack", href: "/integrations/slack" },
      { roles: [], label: "Media uploads", href: "/integrations/media" },
    ],
  },
  {
    label: "Access control",
    href: "/settings/network",
    icon: "Shield",
    roles: [SUPER_ADMIN],
    children: [{ roles: [], label: "LAN / Wi‑Fi restriction", href: "/settings/network" }],
  },
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
  if (role === ROLES.SUPER_ADMIN) return true;

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

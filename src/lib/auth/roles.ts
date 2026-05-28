import { ROLES } from "@/app/consts/common";
import type { UserRole } from "@/types/auth";

export function canManageEmployees(role: UserRole): boolean {
  return role === ROLES.HR_MANAGER || role === ROLES.SUPER_ADMIN;
}

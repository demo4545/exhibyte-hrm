import { ROLES } from "@/app/consts/common";
const { SUPER_ADMIN, HR_MANAGER, EMPLOYEE } = ROLES;

export type UserRole = typeof SUPER_ADMIN | typeof HR_MANAGER | typeof EMPLOYEE;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
};

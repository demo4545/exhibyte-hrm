import type { EmployeeFormState } from "./form";

/** Fields returned in `/api/employee` list for non–HR / non–super-admin viewers. */
export const EMPLOYEE_LIST_PUBLIC_FIELDS = [
  "profileImage",
  "name",
  "role",
  "position",
  "status",
] as const satisfies readonly (keyof EmployeeFormState)[];

/** Never exposed or writable by employees in the app (HR / super admin only). */
export const EMPLOYEE_HR_ONLY_FIELDS = [
  "salary",
] as const satisfies readonly (keyof EmployeeFormState)[];

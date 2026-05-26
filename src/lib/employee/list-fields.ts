import type { EmployeeFormState } from "./form";

/** Fields returned in `/api/employee` list for non–HR / non–super-admin viewers. */
export const EMPLOYEE_LIST_PUBLIC_FIELDS = [
  "profileImage",
  "name",
  "role",
  "position",
  "status",
] as const satisfies readonly (keyof EmployeeFormState)[];

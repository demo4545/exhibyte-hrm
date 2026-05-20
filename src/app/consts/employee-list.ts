import type { EmployeeFormState } from "@/lib/employee";

export type EmployeeListColumn = {
  key: keyof EmployeeFormState;
  header: string;
  sortable?: boolean;
};

/** Columns shown on the employee directory table. */
export const EMPLOYEE_LIST_COLUMNS: EmployeeListColumn[] = [
  { key: "profileImage", header: "", sortable: false },
  { key: "name", header: "Name" },
  { key: "role", header: "Role" },
  { key: "position", header: "Position" },
  // { key: "email", header: "Email" },
  // { key: "contactNumber", header: "Contact" },
  { key: "status", header: "Status", sortable: false },
];

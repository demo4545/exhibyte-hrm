export type EmployeeRow = {
    id: string;
} & Record<string, string>;

export type EmployeeStatus =
    | "ACTIVE"
    | "INACTIVE";

export interface Employee {
    employeeId: string;
    name: string;
    email: string;
    department: string;
    designation?: string;
    status?: EmployeeStatus;
}
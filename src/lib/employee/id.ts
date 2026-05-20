export function generateEmployeeId(totalEmployees: number): string {
  return `EMP${String(totalEmployees + 1).padStart(3, "0")}`;
}

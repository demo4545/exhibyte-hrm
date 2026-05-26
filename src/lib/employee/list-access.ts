import { headerToFormKey } from "./form";
import { getSheetHeaders } from "./headers";
import { EMPLOYEE_LIST_PUBLIC_FIELDS } from "./list-fields";

const PUBLIC_FIELD_SET = new Set<string>(EMPLOYEE_LIST_PUBLIC_FIELDS);

/**
 * Limit sheet rows to directory-safe columns for employees.
 * HR / super admin receive the full row (call with canViewFullDetails true).
 * Server-only — import from `@/lib/employee/list-access` in API routes.
 */
export function filterEmployeeSheetForViewer(
  data: string[][],
  canViewFullDetails: boolean,
): string[][] {
  if (!data.length || canViewFullDetails) return data;

  const headers = getSheetHeaders(data);
  const keepIndices = headers
    .map((header, index) => ({
      index,
      key: headerToFormKey(header),
    }))
    .filter(({ key }) => key != null && PUBLIC_FIELD_SET.has(key))
    .map(({ index }) => index);

  if (!keepIndices.length) {
    return [headers.map((h) => h)];
  }

  const pickCells = (row: string[]) =>
    keepIndices.map((colIndex) => row[colIndex] ?? "");

  return [pickCells(headers), ...data.slice(1).map(pickCells)];
}

/** Filter a single row + headers pair for the current viewer role. */
export function filterEmployeeRowForViewer(
  headers: string[],
  row: string[],
  canViewFullDetails: boolean,
): { headers: string[]; row: string[] } {
  const filtered = filterEmployeeSheetForViewer([headers, row], canViewFullDetails);
  return {
    headers: filtered[0] ?? [],
    row: filtered[1] ?? [],
  };
}

export { EMPLOYEE_LIST_PUBLIC_FIELDS } from "./list-fields";

import { headerToFormKey, type EmployeeFormState } from "./form";

/** Read selected form fields from a sheet row using header mapping. */
export function pickSheetRowFields(
  headers: string[],
  row: string[],
  fields: readonly (keyof EmployeeFormState)[],
): Record<string, string> {
  const formKeyByIndex = headers.map(headerToFormKey);
  const record: Record<string, string> = {};

  for (const field of fields) {
    const colIndex = formKeyByIndex.indexOf(field);
    record[field] = colIndex >= 0 ? String(row[colIndex] ?? "") : "";
  }

  return record;
}

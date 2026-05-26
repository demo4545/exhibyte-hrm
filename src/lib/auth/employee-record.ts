import { getSheetHeaders, sheetRowToForm } from "@/lib/employee";
import { EMPLOYEE_SHEET_RANGE, readSheet } from "@/lib/google/sheets";
import type { SessionUser } from "@/types/auth";

export type ResolvedEmployeeRecord = {
  sheetRow: number;
  headers: string[];
  row: string[];
};

/** Find the sheet row for the signed-in user. */
export async function resolveEmployeeRecordForSession(
  user: SessionUser,
): Promise<ResolvedEmployeeRecord | null> {
  const raw = await readSheet(EMPLOYEE_SHEET_RANGE);
  const headers = getSheetHeaders(raw);

  if (user.sheetRow != null && user.sheetRow >= 2 && user.sheetRow <= raw.length) {
    return {
      sheetRow: user.sheetRow,
      headers,
      row: raw[user.sheetRow - 1] ?? [],
    };
  }

  const loginId = user.email.trim().toLowerCase();

  for (let index = 1; index < raw.length; index++) {
    const row = raw[index] ?? [];
    const form = sheetRowToForm(headers, row);
    const rowEmail = form.email.trim().toLowerCase();
    const rowUsername = form.username.trim().toLowerCase();
    if (rowEmail === loginId || (rowUsername && rowUsername === loginId)) {
      return { sheetRow: index + 1, headers, row };
    }
  }

  return null;
}

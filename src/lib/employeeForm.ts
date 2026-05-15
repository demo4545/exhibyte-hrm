import { STATUS } from "@/app/consts/common";
import { headerToKey } from "@/lib/sheetSort";

export const initialEmployeeForm = {
  status: STATUS.ACTIVE,
  name: "",
  address: "",
  pancard: "",
  aadharCard: "",
  marksheet: "",
  parentGuardian: "",
  experience: "",
  joiningDate: "",
  techSkills: "",
  role: "",
  birthdayDate: "",
  lastIncrementDate: "",
};

export type EmployeeFormState = {
  [K in keyof typeof initialEmployeeForm]: string;
};

/** Maps normalized sheet header → form field key */
const SHEET_KEY_TO_FORM: Record<string, keyof EmployeeFormState> = {
  status: "status",
  name: "name",
  role: "role",
  tech_skills: "techSkills",
  experience: "experience",
  joining_date: "joiningDate",
  last_increment_date: "lastIncrementDate",
  address: "address",
  birthday_date: "birthdayDate",
  pancard: "pancard",
  aadhar_card: "aadharCard",
  marksheet: "marksheet",
  parent_guardian_information: "parentGuardian",
};

export function headerToFormKey(header: string): keyof EmployeeFormState | null {
  const key = headerToKey(header);
  return SHEET_KEY_TO_FORM[key] ?? null;
}

/**
 * Build a sheet row using the live header row order from Google Sheets.
 * Unknown columns are left empty; unmapped form fields are omitted.
 */
export function formToSheetRow(
  form: EmployeeFormState,
  headers: string[],
): string[] {
  return headers.map((header) => {
    if (!header.trim()) return "";
    const formKey = headerToFormKey(header);
    return formKey ? String(form[formKey] ?? "") : "";
  });
}

/** Convert a sheet data row into form state (header order from sheet) */
export function sheetRowToForm(
  headers: string[],
  row: string[],
): EmployeeFormState {
  const form: EmployeeFormState = {
    name: "",
    address: "",
    pancard: "",
    aadharCard: "",
    marksheet: "",
    parentGuardian: "",
    experience: "",
    joiningDate: "",
    techSkills: "",
    role: "",
    birthdayDate: "",
    lastIncrementDate: "",
    status: STATUS.ACTIVE,
  };

  headers.forEach((header, index) => {
    const formKey = headerToFormKey(header);
    if (!formKey) return;

    const raw = row[index] ?? "";
    if (formKey === "status") {
      form.status = normalizeStatus(raw);
      return;
    }

    form[formKey] = raw;
  });

  return form;
}

/** Map sheet status cell → form value (Active / Inactive) */
export function normalizeStatus(value: string): string {
  const v = value.trim().toLowerCase();
  if (v === STATUS.INACTIVE.toLowerCase() || v === "inactive") {
    return STATUS.INACTIVE;
  }
  if (v === STATUS.ACTIVE.toLowerCase() || v === "active") {
    return STATUS.ACTIVE;
  }
  return value.trim() ? value.trim() : STATUS.ACTIVE;
}

/** Build A1 range for a single sheet row (e.g. Sheet1!A5:L5) */
export function sheetRowToRange(sheetRow: number, columnCount: number): string {
  const endColumn = columnIndexToLetter(columnCount);
  return `Sheet1!A${sheetRow}:${endColumn}${sheetRow}`;
}

function columnIndexToLetter(columnCount: number): string {
  let letter = "";
  let n = Math.max(1, columnCount);

  while (n > 0) {
    const remainder = (n - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    n = Math.floor((n - 1) / 26);
  }

  return letter;
}

/** Header row from sheet; trims trailing blank columns only */
export function getSheetHeaders(sheetData: string[][]): string[] {
  const headers = [...((sheetData[0] as string[]) ?? [])];
  while (headers.length > 0 && !headers[headers.length - 1]?.trim()) {
    headers.pop();
  }
  return headers;
}

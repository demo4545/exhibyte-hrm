import { STATUS } from "@/app/consts/common";

export const initialEmployeeForm = {
  employeeId: "",
  status: STATUS.ACTIVE,
  name: "",
  address: "",
  pancard: "",
  aadharCard: "",
  marksheet: "",
  parentName: "",
  parentContact: "",
  parentDetails: "",
  experience: "",
  joiningDate: "",
  skills: "",
  role: "",
  birthdayDate: "",
  lastIncrementDate: "",
  documentsFolderId: "",
  profileImage: "",
  position: "",
  email: "",
  contactNumber: "",
};

export type EmployeeFormState = {
  [K in keyof typeof initialEmployeeForm]: string;
};

/** Maps normalized sheet header → form field key */
const SHEET_KEY_TO_FORM: Record<string, keyof EmployeeFormState> = {
  employee_id: "employeeId",
  status: "status",
  name: "name",
  role: "role",
  skills: "skills",
  experience: "experience",
  address: "address",
  birthday_date: "birthdayDate",
  joining_date: "joiningDate",
  email: "email",
  contact_number: "contactNumber",
  profile_image: "profileImage",
  position: "position",
  pancard: "pancard",
  aadhar_card: "aadharCard",
  parent_name: "parentName",
  parent_contact: "parentContact",
  parent_details: "parentDetails",
  last_increment_date: "lastIncrementDate",
  marksheet: "marksheet",
  documents_folder_id: "documentsFolderId",
};

/** Normalize sheet header for form lookup (camelCase, spaces → snake_case). */
function headerToSheetFormLookupKey(header: string): string {
  return header
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/\s+/g, "_")
    .toLowerCase();
}

export function headerToFormKey(
  header: string,
): keyof EmployeeFormState | null {
  const key = headerToSheetFormLookupKey(header);
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
    employeeId: "",
    documentsFolderId: "",
    name: "",
    address: "",
    pancard: "",
    aadharCard: "",
    marksheet: "",
    parentName: "",
    parentContact: "",
    parentDetails: "",
    experience: "",
    joiningDate: "",
    position: "",
    skills: "",
    role: "",
    birthdayDate: "",
    lastIncrementDate: "",
    profileImage: "",
    email: "",
    contactNumber: "",
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

/** Employee domain — form, sheet, search, and API helpers */

export { generateEmployeeId } from "./id";

export {
  initialEmployeeForm,
  type EmployeeFormState,
  headerToFormKey,
  formToSheetRow,
  sheetRowToForm,
  normalizeStatus,
} from "./form";

export {
  getSheetHeaders,
  mergeRowWithFormFields,
  getEmployeeNameFromRow,
  sheetRowToRange,
} from "./headers";

export type { SortOrder } from "./sort";
export { headerToKey, sortSheetData } from "./sort";

export { EMPLOYEE_SEARCH_KEYS, filterSheetBySearch } from "./search";

export { DEFAULT_PAGE_SIZE, paginateSheetData } from "./pagination";

export type { IndexedSheetRow } from "./process";
export {
  indexSheetBody,
  indexedRowsToSheetData,
  processEmployeeSheet,
} from "./process";

export {
  EMPLOYEE_DOCUMENT_FIELDS,
  type EmployeeDocumentField,
  getDocumentDisplayName,
  parseGoogleDriveFileId,
  resolveProfileImageSrc,
} from "./documents";

export { pickSheetRowFields } from "./list";

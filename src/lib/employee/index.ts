/** Employee domain — form, sheet, search, and API helpers */

export { generateEmployeeId } from "./id";

export {
  initialEmployeeForm,
  type EmployeeFormState,
  headerToFormKey,
  formToSheetRow,
  sheetRowToForm,
  normalizeStatus,
  isEmployeeStatusActive,
} from "./form";

export {
  getSheetHeaders,
  mergeRowWithFormFields,
  getEmployeeNameFromRow,
  getEmployeeIdFromRow,
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
  isIndexedRowInactive,
  processEmployeeSheet,
} from "./process";

export {
  EMPLOYEE_DOCUMENT_FIELDS,
  type EmployeeDocumentField,
  getDocumentDisplayName,
  getDocumentHref,
  parseGoogleDriveFileId,
  resolveProfileImageSrc,
} from "./documents";

export { EMPLOYEE_LIST_PUBLIC_FIELDS } from "./list-fields";
export { parseEmployeeListApiResponse, pickSheetRowFields } from "./list";
export { maskAadhar, maskPan } from "./mask";

export {
  formatSheetTimestamp,
  sheetTimestampsForCreate,
  sheetTimestampsForUpdate,
  withSheetRowUpdatedAt,
} from "./timestamps";

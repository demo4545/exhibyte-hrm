/** Net working time required per day (break time does not count). */
export const IDEAL_WORKING_HOURS = 8;

/** Standard paid break allowance per day. */
export const IDEAL_BREAK_HOURS = 1;

/** Default break assumed for legacy CSV imports (no break column in source file). */
export const IMPORT_DEFAULT_BREAK = "1h";

/** Typical on-site duration: work + break (e.g. 8h + 1h = 9h). */
export const IDEAL_SHIFT_HOURS = IDEAL_WORKING_HOURS + IDEAL_BREAK_HOURS;

export const ATTENDANCE_HEADERS = [
  "Date",
  "Punch In",
  "Punch Out",
  "Break Start",
  "Break End",
  "Total Break Time",
  "Working Hours",
  "Status",
  "Overtime",
  "Early Leave Reason",
] as const;

/** Last column letter for attendance row ranges (A through J). */
export const ATTENDANCE_LAST_COLUMN = "J";

export type AttendanceColumn = (typeof ATTENDANCE_HEADERS)[number];

export const ATTENDANCE_COL = {
  date: 0,
  punchIn: 1,
  punchOut: 2,
  breakStart: 3,
  breakEnd: 4,
  totalBreakTime: 5,
  workingHours: 6,
  status: 7,
  overtime: 8,
  earlyLeaveReason: 9,
} as const;

/** Minimum characters for early leave reason on punch-out. */
export const EARLY_LEAVE_REASON_MIN_LENGTH = 10;

export const WORKING_STATUS = {
  SHORT: "Short Hours",
  COMPLETED: "Completed",
  OVERTIME: "Overtime",
  IN_PROGRESS: "In Progress",
} as const;

export type WorkingStatus = (typeof WORKING_STATUS)[keyof typeof WORKING_STATUS];

export const CORRECTION_STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
} as const;

export type CorrectionStatus =
  (typeof CORRECTION_STATUS)[keyof typeof CORRECTION_STATUS];

export const CORRECTION_FIELDS = [
  "punchIn",
  "punchOut",
  "breakStart",
  "breakEnd",
] as const;

export type CorrectionField = (typeof CORRECTION_FIELDS)[number];

export const CORRECTION_SHEET_TITLE = "AttendanceCorrections";

export const CORRECTION_HEADERS = [
  "ID",
  "Employee ID",
  "Employee Name",
  "Attendance Spreadsheet ID",
  "Date",
  "Field",
  "Original Value",
  "Requested Value",
  "Reason",
  "Status",
  "Remarks",
  "Approved By",
  "Approved Date",
  "Created At",
] as const;

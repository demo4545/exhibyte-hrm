import {
  ATTENDANCE_COL,
  ATTENDANCE_HEADERS,
  ATTENDANCE_LAST_COLUMN,
  EARLY_LEAVE_REASON_MIN_LENGTH,
  IMPORT_DEFAULT_BREAK,
  WORKING_STATUS,
} from "@/lib/attendance/constants";
import {
  computeAttendanceMetrics,
  formatClockTime,
  formatDuration,
  formatIsoDate,
  formatSheetDateLiteral,
  monthlySheetTitle,
  normalizeSheetDate,
  parseDurationToMs,
  parseSheetClockTime,
  parseTimeOnDate,
} from "@/lib/attendance/time";

import { formatDriveError, getDrive, getSheetsClient } from "./drive-auth";
import {
  applySheetHeaderFormatByTitle,
  applySheetHeaderFormatForTitles,
  applySheetHeaderRowFormat,
} from "./sheet-format";

const attendanceSpreadsheetLocks = new Map<string, Promise<string>>();

export type AttendanceRow = {
  sheetRow: number;
  date: string;
  punchIn: string;
  punchOut: string;
  breakStart: string;
  breakEnd: string;
  totalBreakTime: string;
  workingHours: string;
  status: string;
  overtime: string;
  earlyLeaveReason: string;
};

function applyAttendanceMetrics(rowValues: string[], baseDate: Date): void {
  const punchOut = (rowValues[ATTENDANCE_COL.punchOut] ?? "").trim();
  const metrics = computeAttendanceMetrics({
    punchIn: rowValues[ATTENDANCE_COL.punchIn] ?? "",
    punchOut: rowValues[ATTENDANCE_COL.punchOut] ?? "",
    totalBreakTime: rowValues[ATTENDANCE_COL.totalBreakTime] ?? "",
    baseDate,
    punchedOut: Boolean(punchOut),
  });

  if (punchOut) {
    rowValues[ATTENDANCE_COL.workingHours] = metrics.workingHours;
    rowValues[ATTENDANCE_COL.overtime] = metrics.overtime;
    rowValues[ATTENDANCE_COL.status] = metrics.status;
  } else {
    rowValues[ATTENDANCE_COL.overtime] = "—";
    rowValues[ATTENDANCE_COL.status] = WORKING_STATUS.IN_PROGRESS;
  }
}

function rowFromValues(values: string[], sheetRow: number): AttendanceRow {
  const dateStr = normalizeSheetDate(values[ATTENDANCE_COL.date] ?? "");
  const baseDate = dateStr ? new Date(dateStr) : new Date();
  const punchOut = values[ATTENDANCE_COL.punchOut] ?? "";
  const punchedOut = Boolean(punchOut.trim());

  const metrics = computeAttendanceMetrics({
    punchIn: values[ATTENDANCE_COL.punchIn] ?? "",
    punchOut,
    totalBreakTime: values[ATTENDANCE_COL.totalBreakTime] ?? "",
    baseDate,
    punchedOut,
  });

  return {
    sheetRow,
    date: dateStr,
    punchIn: values[ATTENDANCE_COL.punchIn] ?? "",
    punchOut,
    breakStart: values[ATTENDANCE_COL.breakStart] ?? "",
    breakEnd: values[ATTENDANCE_COL.breakEnd] ?? "",
    totalBreakTime: values[ATTENDANCE_COL.totalBreakTime] ?? "",
    workingHours: punchedOut ? metrics.workingHours : "",
    status: punchedOut ? metrics.status : (values[ATTENDANCE_COL.status] ?? WORKING_STATUS.IN_PROGRESS),
    overtime: punchedOut ? metrics.overtime : "—",
    earlyLeaveReason: values[ATTENDANCE_COL.earlyLeaveReason] ?? "",
  };
}

export function attendanceSpreadsheetFileName(
  employeeId: string,
  employeeName: string,
): string {
  return `${employeeId} - ${employeeName} - Attendance`;
}

/** Reuse an existing attendance file in the employee folder (avoids duplicates). */
export async function findAttendanceSpreadsheetInFolder(
  parentFolderId: string,
  employeeId: string,
  employeeName: string,
): Promise<string | null> {
  const drive = await getDrive();
  const name = attendanceSpreadsheetFileName(employeeId, employeeName);
  const query = [
    "mimeType = 'application/vnd.google-apps.spreadsheet'",
    "trashed = false",
    `'${parentFolderId}' in parents`,
    `name = '${name.replace(/'/g, "\\'")}'`,
  ].join(" and ");

  const response = await drive.files.list({
    q: query,
    fields: "files(id,createdTime)",
    orderBy: "createdTime",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return response.data.files?.[0]?.id ?? null;
}

export async function getOrCreateEmployeeAttendanceSpreadsheet(
  employeeId: string,
  employeeName: string,
  parentFolderId: string,
): Promise<string> {
  const lockKey = `${parentFolderId}:${employeeId}`;
  const existing = attendanceSpreadsheetLocks.get(lockKey);
  if (existing) return existing;

  const promise = (async () => {
    const found = await findAttendanceSpreadsheetInFolder(
      parentFolderId,
      employeeId,
      employeeName,
    );
    if (found) return found;
    return createEmployeeAttendanceSpreadsheet(
      employeeId,
      employeeName,
      parentFolderId,
    );
  })();

  attendanceSpreadsheetLocks.set(lockKey, promise);
  try {
    return await promise;
  } finally {
    attendanceSpreadsheetLocks.delete(lockKey);
  }
}

export async function createEmployeeAttendanceSpreadsheet(
  employeeId: string,
  employeeName: string,
  parentFolderId: string,
): Promise<string> {
  const title = attendanceSpreadsheetFileName(employeeId, employeeName);
  const sheetName = monthlySheetTitle();

  try {
    const drive = await getDrive();
    const created = await drive.files.create({
      requestBody: {
        name: title,
        mimeType: "application/vnd.google-apps.spreadsheet",
        parents: [parentFolderId],
      },
      fields: "id",
      supportsAllDrives: true,
    });

    const spreadsheetId = created.data.id;
    if (!spreadsheetId) {
      throw new Error("Failed to create attendance spreadsheet in Drive");
    }

    const sheetsApi = await getSheetsClient();
    const meta = await sheetsApi.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    });
    const defaultSheetId = meta.data.sheets?.[0]?.properties?.sheetId;

    if (defaultSheetId != null) {
      await sheetsApi.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              updateSheetProperties: {
                properties: { sheetId: defaultSheetId, title: sheetName },
                fields: "title",
              },
            },
          ],
        },
      });
    }

    await sheetsApi.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:${ATTENDANCE_LAST_COLUMN}1`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [ATTENDANCE_HEADERS as unknown as string[]],
      },
    });

    const sheetId =
      defaultSheetId ??
      (await getSheetId(spreadsheetId, sheetName));
    if (sheetId != null) {
      await applySheetHeaderRowFormat(
        sheetsApi,
        spreadsheetId,
        sheetId,
        ATTENDANCE_HEADERS.length,
      );
    }

    return spreadsheetId;
  } catch (error) {
    throw formatDriveError(error);
  }
}

async function getSheetId(
  spreadsheetId: string,
  title: string,
): Promise<number | null> {
  const sheetsApi = await getSheetsClient();
  const meta = await sheetsApi.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });

  const normalized = title.trim().toLowerCase();
  const sheet = meta.data.sheets?.find(
    (s) => (s.properties?.title ?? "").trim().toLowerCase() === normalized,
  );
  return sheet?.properties?.sheetId ?? null;
}

export async function listMonthlySheets(
  spreadsheetId: string,
): Promise<string[]> {
  const sheetsApi = await getSheetsClient();
  const meta = await sheetsApi.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });

  return (
    meta.data.sheets
      ?.map((s) => s.properties?.title ?? "")
      .filter((title) => /^[A-Za-z]{3}-\d{4}$/.test(title)) ?? []
  );
}

async function ensureAttendanceHeaderRow(
  spreadsheetId: string,
  sheetTitle: string,
): Promise<void> {
  const sheetsApi = await getSheetsClient();
  const response = await sheetsApi.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetTitle}'!A1:${ATTENDANCE_LAST_COLUMN}1`,
  });
  const row = response.data.values?.[0] ?? [];
  const expected = ATTENDANCE_HEADERS as unknown as string[];
  const needsUpdate =
    row.length < expected.length ||
    expected.some((header, i) => (row[i] ?? "").trim() !== header);

  if (needsUpdate) {
    await sheetsApi.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetTitle}'!A1:${ATTENDANCE_LAST_COLUMN}1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [expected] },
    });
  }

  await applySheetHeaderFormatByTitle(
    spreadsheetId,
    sheetTitle,
    ATTENDANCE_HEADERS.length,
  );
}

export async function ensureMonthlySheet(
  spreadsheetId: string,
  date: Date = new Date(),
): Promise<string> {
  const title = monthlySheetTitle(date);
  const existingId = await getSheetId(spreadsheetId, title);
  if (existingId != null) {
    await ensureAttendanceHeaderRow(spreadsheetId, title);
    return title;
  }

  const sheetsApi = await getSheetsClient();
  const meta = await sheetsApi.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });
  const sheets = meta.data.sheets ?? [];

  const defaultSheet = sheets.find((s) => {
    const t = s.properties?.title ?? "";
    return t === "Sheet1" || /^Sheet\d+$/.test(t);
  });

  if (sheets.length === 1 && defaultSheet?.properties?.sheetId != null) {
    await sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: defaultSheet.properties.sheetId,
                title,
              },
              fields: "title",
            },
          },
        ],
      },
    });
  } else {
    await sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title },
            },
          },
        ],
      },
    });
  }

  await sheetsApi.spreadsheets.values.update({
    spreadsheetId,
    range: `${title}!A1:${ATTENDANCE_LAST_COLUMN}1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [ATTENDANCE_HEADERS as unknown as string[]],
    },
  });

  await applySheetHeaderFormatByTitle(
    spreadsheetId,
    title,
    ATTENDANCE_HEADERS.length,
  );

  return title;
}

/** Apply standard header styling to every monthly tab (existing + new). */
export async function formatAllAttendanceMonthlyHeaders(
  spreadsheetId: string,
): Promise<void> {
  const titles = await listMonthlySheets(spreadsheetId);
  for (const sheetTitle of titles) {
    await ensureAttendanceHeaderRow(spreadsheetId, sheetTitle);
  }
  if (titles.length > 0) {
    await applySheetHeaderFormatForTitles(
      spreadsheetId,
      titles,
      ATTENDANCE_HEADERS.length,
    );
  }
}

async function readMonthlyRows(
  spreadsheetId: string,
  sheetTitle: string,
): Promise<string[][]> {
  const sheetsApi = await getSheetsClient();
  const response = await sheetsApi.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetTitle}'!A:${ATTENDANCE_LAST_COLUMN}`,
  });

  return response.data.values ?? [];
}

function findTodayRow(
  rows: string[][],
  today: string,
): { row: string[]; sheetRow: number } | null {
  const target = normalizeSheetDate(today);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const rowDate = normalizeSheetDate(row[ATTENDANCE_COL.date] ?? "");
    if (rowDate === target) {
      return { row, sheetRow: i + 1 };
    }
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const punchIn = (row[ATTENDANCE_COL.punchIn] ?? "").trim();
    const punchOut = (row[ATTENDANCE_COL.punchOut] ?? "").trim();
    const rowDate = normalizeSheetDate(row[ATTENDANCE_COL.date] ?? "");
    if (!rowDate && punchIn && !punchOut) {
      return { row, sheetRow: i + 1 };
    }
  }

  return null;
}

export async function getTodayAttendance(
  spreadsheetId: string,
  date: Date = new Date(),
): Promise<AttendanceRow | null> {
  const sheetTitle = await ensureMonthlySheet(spreadsheetId, date);
  const rows = await readMonthlyRows(spreadsheetId, sheetTitle);
  const today = formatIsoDate(date);
  const found = findTodayRow(rows, today);
  if (!found) return null;
  return rowFromValues(found.row, found.sheetRow);
}

async function updateAttendanceRow(
  spreadsheetId: string,
  sheetTitle: string,
  sheetRow: number,
  values: string[],
): Promise<void> {
  const sheetsApi = await getSheetsClient();
  await sheetsApi.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetTitle}'!A${sheetRow}:${ATTENDANCE_LAST_COLUMN}${sheetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

function buildRowValues(existing: string[] | undefined, date: Date): string[] {
  const base = [...(existing ?? [])];
  while (base.length < ATTENDANCE_HEADERS.length) base.push("");
  if (!normalizeSheetDate(base[ATTENDANCE_COL.date] ?? "")) {
    base[ATTENDANCE_COL.date] = formatSheetDateLiteral(date);
  }
  return base;
}

export async function punchIn(
  spreadsheetId: string,
  date: Date = new Date(),
): Promise<AttendanceRow> {
  const sheetTitle = await ensureMonthlySheet(spreadsheetId, date);
  const rows = await readMonthlyRows(spreadsheetId, sheetTitle);
  const today = formatIsoDate(date);
  const found = findTodayRow(rows, today);

  if (found?.row[ATTENDANCE_COL.punchIn]?.trim()) {
    throw new Error("Already punched in today");
  }

  const now = formatClockTime(date);
  const rowValues = buildRowValues(found?.row, date);
  rowValues[ATTENDANCE_COL.punchIn] = now;
  rowValues[ATTENDANCE_COL.overtime] = "—";
  rowValues[ATTENDANCE_COL.status] = WORKING_STATUS.IN_PROGRESS;

  const targetRow = found?.sheetRow ?? Math.max(rows.length + 1, 2);
  await updateAttendanceRow(
    spreadsheetId,
    sheetTitle,
    targetRow,
    rowValues,
  );

  return rowFromValues(rowValues, targetRow);
}

export async function punchOut(
  spreadsheetId: string,
  date: Date = new Date(),
  options?: { earlyLeaveReason?: string },
): Promise<AttendanceRow> {
  const sheetTitle = await ensureMonthlySheet(spreadsheetId, date);
  const rows = await readMonthlyRows(spreadsheetId, sheetTitle);
  const today = formatIsoDate(date);
  const found = findTodayRow(rows, today);

  if (!found?.row[ATTENDANCE_COL.punchIn]?.trim()) {
    throw new Error("Punch in first before punching out");
  }
  if (found.row[ATTENDANCE_COL.punchOut]?.trim()) {
    throw new Error("Already punched out today");
  }
  if (found.row[ATTENDANCE_COL.breakStart]?.trim() && !found.row[ATTENDANCE_COL.breakEnd]?.trim()) {
    throw new Error("End your break before punching out");
  }

  const rowValues = [...found.row];
  while (rowValues.length < ATTENDANCE_HEADERS.length) rowValues.push("");

  rowValues[ATTENDANCE_COL.punchOut] = formatClockTime(date);
  applyAttendanceMetrics(rowValues, date);

  const status = rowValues[ATTENDANCE_COL.status] ?? "";
  if (status === WORKING_STATUS.SHORT) {
    const reason = options?.earlyLeaveReason?.trim() ?? "";
    if (!reason) {
      throw new Error("Please provide a reason for leaving early");
    }
    if (reason.length < EARLY_LEAVE_REASON_MIN_LENGTH) {
      throw new Error(
        `Early leave reason must be at least ${EARLY_LEAVE_REASON_MIN_LENGTH} characters`,
      );
    }
    rowValues[ATTENDANCE_COL.earlyLeaveReason] = reason;
  } else {
    rowValues[ATTENDANCE_COL.earlyLeaveReason] = "";
  }

  await updateAttendanceRow(
    spreadsheetId,
    sheetTitle,
    found.sheetRow,
    rowValues,
  );

  return rowFromValues(rowValues, found.sheetRow);
}

export async function startBreak(
  spreadsheetId: string,
  date: Date = new Date(),
): Promise<AttendanceRow> {
  const sheetTitle = await ensureMonthlySheet(spreadsheetId, date);
  const rows = await readMonthlyRows(spreadsheetId, sheetTitle);
  const today = formatIsoDate(date);
  const found = findTodayRow(rows, today);

  if (!found?.row[ATTENDANCE_COL.punchIn]?.trim()) {
    throw new Error("Punch in first before starting a break");
  }
  if (found.row[ATTENDANCE_COL.punchOut]?.trim()) {
    throw new Error("Cannot start a break after punch out");
  }
  if (found.row[ATTENDANCE_COL.breakStart]?.trim() && !found.row[ATTENDANCE_COL.breakEnd]?.trim()) {
    throw new Error("Already on break");
  }

  const rowValues = [...found.row];
  while (rowValues.length < ATTENDANCE_HEADERS.length) rowValues.push("");

  rowValues[ATTENDANCE_COL.breakStart] = formatClockTime(date);
  rowValues[ATTENDANCE_COL.breakEnd] = "";

  await updateAttendanceRow(
    spreadsheetId,
    sheetTitle,
    found.sheetRow,
    rowValues,
  );

  return rowFromValues(rowValues, found.sheetRow);
}

export async function endBreak(
  spreadsheetId: string,
  date: Date = new Date(),
): Promise<AttendanceRow> {
  const sheetTitle = await ensureMonthlySheet(spreadsheetId, date);
  const rows = await readMonthlyRows(spreadsheetId, sheetTitle);
  const today = formatIsoDate(date);
  const found = findTodayRow(rows, today);

  if (!found?.row[ATTENDANCE_COL.breakStart]?.trim()) {
    throw new Error("No active break to end");
  }
  if (found.row[ATTENDANCE_COL.breakEnd]?.trim()) {
    throw new Error("No active break to end");
  }

  const rowValues = [...found.row];
  while (rowValues.length < ATTENDANCE_HEADERS.length) rowValues.push("");

  const breakEnd = formatClockTime(date);
  rowValues[ATTENDANCE_COL.breakEnd] = breakEnd;

  const breakStartMs = parseTimeOnDate(
    rowValues[ATTENDANCE_COL.breakStart],
    date,
  );
  const breakEndMs = parseTimeOnDate(breakEnd, date);
  const breakMs =
    breakStartMs != null && breakEndMs != null && breakEndMs > breakStartMs
      ? breakEndMs - breakStartMs
      : 0;

  const existingBreakMs = parseDurationToMs(
    rowValues[ATTENDANCE_COL.totalBreakTime] ?? "",
  );
  rowValues[ATTENDANCE_COL.totalBreakTime] = formatDuration(existingBreakMs + breakMs);
  rowValues[ATTENDANCE_COL.breakStart] = "";
  rowValues[ATTENDANCE_COL.breakEnd] = "";

  await updateAttendanceRow(
    spreadsheetId,
    sheetTitle,
    found.sheetRow,
    rowValues,
  );

  return rowFromValues(rowValues, found.sheetRow);
}

export async function getMonthAttendance(
  spreadsheetId: string,
  year: number,
  monthIndex: number,
): Promise<AttendanceRow[]> {
  const date = new Date(year, monthIndex, 1);
  const sheetTitle = monthlySheetTitle(date);
  const sheetId = await getSheetId(spreadsheetId, sheetTitle);
  if (sheetId == null) return [];

  const rows = await readMonthlyRows(spreadsheetId, sheetTitle);
  const records: AttendanceRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (!(row[ATTENDANCE_COL.date] ?? "").trim()) continue;
    records.push(rowFromValues(row, i + 1));
  }

  return records;
}

export async function updateAttendanceField(
  spreadsheetId: string,
  dateIso: string,
  field: keyof typeof ATTENDANCE_COL,
  value: string,
): Promise<AttendanceRow> {
  const [year, month] = dateIso.split("-").map((p) => parseInt(p, 10));
  const date = new Date(year, (month || 1) - 1, 1);
  const sheetTitle = monthlySheetTitle(date);
  const rows = await readMonthlyRows(spreadsheetId, sheetTitle);
  const found = findTodayRow(rows, dateIso);

  if (!found) {
    throw new Error("Attendance record not found for correction date");
  }

  const rowValues = [...found.row];
  while (rowValues.length < ATTENDANCE_HEADERS.length) rowValues.push("");

  const col = ATTENDANCE_COL[field];
  rowValues[col] = value;

  if (rowValues[ATTENDANCE_COL.punchIn] && rowValues[ATTENDANCE_COL.punchOut]) {
    applyAttendanceMetrics(rowValues, new Date(dateIso));
  }

  await updateAttendanceRow(
    spreadsheetId,
    sheetTitle,
    found.sheetRow,
    rowValues,
  );

  return rowFromValues(rowValues, found.sheetRow);
}

export async function importAttendanceRecords(
  spreadsheetId: string,
  records: Array<{ dateIso: string; punchIn: string; punchOut: string }>,
): Promise<{ imported: number; updated: number }> {
  let imported = 0;
  let updated = 0;

  for (const record of records) {
    const baseDate = new Date(record.dateIso);
    const sheetTitle = await ensureMonthlySheet(spreadsheetId, baseDate);
    const existingRows = await readMonthlyRows(spreadsheetId, sheetTitle);
    const found = findTodayRow(existingRows, record.dateIso);

    const rowValues = buildRowValues(found?.row, baseDate);
    rowValues[ATTENDANCE_COL.punchIn] = record.punchIn;
    rowValues[ATTENDANCE_COL.punchOut] = record.punchOut;
    rowValues[ATTENDANCE_COL.breakStart] = "";
    rowValues[ATTENDANCE_COL.breakEnd] = "";
    rowValues[ATTENDANCE_COL.totalBreakTime] = IMPORT_DEFAULT_BREAK;

    if (record.punchOut.trim()) {
      applyAttendanceMetrics(rowValues, baseDate);
    } else {
      rowValues[ATTENDANCE_COL.overtime] = "—";
      rowValues[ATTENDANCE_COL.status] = WORKING_STATUS.IN_PROGRESS;
      rowValues[ATTENDANCE_COL.workingHours] = "";
    }

    const targetRow = found?.sheetRow ?? Math.max(existingRows.length + 1, 2);
    await updateAttendanceRow(spreadsheetId, sheetTitle, targetRow, rowValues);

    if (found) updated++;
    else imported++;
  }

  await formatAllAttendanceMonthlyHeaders(spreadsheetId);

  return { imported, updated };
}

export function computeLiveWorkedMs(
  record: AttendanceRow,
  now: Date = new Date(),
): number {
  if (!record.punchIn.trim()) return 0;

  const baseDate = new Date(record.date);

  if (record.punchOut.trim()) {
    return computeAttendanceMetrics({
      punchIn: record.punchIn,
      punchOut: record.punchOut,
      totalBreakTime: record.totalBreakTime,
      baseDate,
      punchedOut: true,
    }).workingMs;
  }

  const punchInMs = parseSheetClockTime(record.punchIn, baseDate, { role: "in" });
  if (punchInMs == null) return 0;

  let totalBreakMs = parseDurationToMs(record.totalBreakTime);

  if (record.breakStart.trim() && !record.breakEnd.trim()) {
    const breakStartMs = parseSheetClockTime(record.breakStart, baseDate, {
      punchIn: record.punchIn,
      role: "out",
    });
    if (breakStartMs != null) {
      totalBreakMs += Math.max(0, now.getTime() - breakStartMs);
    }
  }

  return Math.max(0, now.getTime() - punchInMs - totalBreakMs);
}

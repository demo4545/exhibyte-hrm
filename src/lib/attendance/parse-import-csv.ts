import { formatIsoDate, parseLegacyImportClockTime } from "@/lib/attendance/time";

export type LegacyAttendanceCsvRow = {
  dateIso: string;
  punchIn: string;
  punchOut: string;
  workMode: string;
  skipped: boolean;
  skipReason?: string;
};

export type ParseLegacyCsvResult = {
  rows: LegacyAttendanceCsvRow[];
  errors: string[];
  skipped: number;
};

function splitCsvLine(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '"') {
      if (inQuotes && trimmed[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && (ch === "," || ch === "\t")) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseLegacyDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const month = parseInt(slash[1], 10);
    const day = parseInt(slash[2], 10);
    const year = parseInt(slash[3], 10);
    const date = new Date(year, month - 1, day);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const date = new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
    if (!Number.isNaN(date.getTime())) return date;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  return null;
}

/** @deprecated Use parseLegacyImportClockTime from `@/lib/attendance/time`. */
export const parseLegacyClockTime = parseLegacyImportClockTime;

function isHolidayRow(workMode: string, inTime: string, outTime: string): boolean {
  const mode = workMode.toLowerCase();
  if (mode.includes("holiday") || mode.includes("weekend") || mode.includes("leave")) {
    return true;
  }
  return !inTime.trim() && !outTime.trim();
}

export function parseLegacyAttendanceCsv(content: string): ParseLegacyCsvResult {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const errors: string[] = [];
  const rows: LegacyAttendanceCsvRow[] = [];
  let skipped = 0;

  if (lines.length < 2) {
    return { rows: [], errors: ["CSV must include a header row and at least one data row."], skipped: 0 };
  }

  const headerCells = splitCsvLine(lines[0]);
  const headerMap = new Map<string, number>();
  headerCells.forEach((cell, index) => {
    headerMap.set(normalizeHeader(cell), index);
  });

  const dateIdx =
    headerMap.get("date") ??
    headerCells.findIndex((h) => normalizeHeader(h).includes("date"));
  const inIdx =
    headerMap.get("in time") ??
    headerMap.get("in") ??
    headerCells.findIndex((h) => normalizeHeader(h).includes("in time"));
  const outIdx =
    headerMap.get("out time") ??
    headerMap.get("out") ??
    headerCells.findIndex((h) => normalizeHeader(h).includes("out time"));
  const modeIdx =
    headerMap.get("work mode") ??
    headerMap.get("mode") ??
    headerCells.findIndex((h) => normalizeHeader(h).includes("work mode"));

  if (dateIdx < 0) {
    return { rows: [], errors: ["Missing required column: Date"], skipped: 0 };
  }

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const dateRaw = cells[dateIdx] ?? "";
    const workMode = modeIdx >= 0 ? (cells[modeIdx] ?? "") : "";
    const inRaw = inIdx >= 0 ? (cells[inIdx] ?? "") : "";
    const outRaw = outIdx >= 0 ? (cells[outIdx] ?? "") : "";

    const date = parseLegacyDate(dateRaw);
    if (!date) {
      errors.push(`Row ${i + 1}: invalid date "${dateRaw}"`);
      continue;
    }

    const punchIn = parseLegacyImportClockTime(inRaw, "in", date);
    const punchOut = parseLegacyImportClockTime(outRaw, "out", date);

    if (isHolidayRow(workMode, punchIn, punchOut)) {
      skipped++;
      rows.push({
        dateIso: formatIsoDate(date),
        punchIn: "",
        punchOut: "",
        workMode,
        skipped: true,
        skipReason: "holiday",
      });
      continue;
    }

    if (!punchIn) {
      errors.push(`Row ${i + 1}: missing In Time for ${formatIsoDate(date)}`);
      continue;
    }

    rows.push({
      dateIso: formatIsoDate(date),
      punchIn,
      punchOut,
      workMode,
      skipped: false,
    });
  }

  return { rows, errors, skipped };
}

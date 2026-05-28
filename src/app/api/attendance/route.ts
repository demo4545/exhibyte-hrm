import { NextRequest, NextResponse } from "next/server";

import {
  EARLY_LEAVE_REASON_MIN_LENGTH,
  IDEAL_BREAK_HOURS,
  IDEAL_SHIFT_HOURS,
  IDEAL_WORKING_HOURS,
} from "@/lib/attendance/constants";
import {
  formatBreakAllowance,
  parseDurationToMs,
  parseTimeOnDate,
} from "@/lib/attendance/time";
import { resolveAttendanceEmployeeForTarget } from "@/lib/attendance/employee";
import {
  computeLiveWorkedMs,
  endBreak,
  getMonthAttendance,
  getTodayAttendance,
  listMonthlySheets,
  punchIn,
  punchOut,
  startBreak,
} from "@/lib/google/attendance-sheets";
import {
  formatDuration,
  formatDurationHms,
  monthLabel,
  parseMonthlySheetTitle,
} from "@/lib/attendance/time";
import { withActiveSession } from "@/lib/auth/api-guard";

function parseTargetSheetRow(searchParams: URLSearchParams, userSheetRow?: number) {
  const param = searchParams.get("employeeSheetRow");
  if (param == null || param === "") return userSheetRow;
  const parsed = parseInt(param, 10);
  return Number.isFinite(parsed) && parsed >= 2 ? parsed : userSheetRow;
}

export const GET = withActiveSession(async (req, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const targetSheetRow = parseTargetSheetRow(searchParams, user.sheetRow);
    const employee = await resolveAttendanceEmployeeForTarget(user, targetSheetRow);
    if (!employee?.attendanceSpreadsheetId) {
      return NextResponse.json(
        { success: false, message: "Employee attendance record not found" },
        { status: 404 },
      );
    }

    const mode = searchParams.get("mode");

    if (mode === "periods") {
      const sheets = await listMonthlySheets(employee.attendanceSpreadsheetId);
      const years = new Set<number>();
      const monthsByYear = new Map<number, number[]>();

      for (const title of sheets) {
        const parsed = parseMonthlySheetTitle(title);
        if (!parsed) continue;
        years.add(parsed.year);
        const months = monthsByYear.get(parsed.year) ?? [];
        if (!months.includes(parsed.month)) {
          months.push(parsed.month);
        }
        monthsByYear.set(parsed.year, months);
      }

      const sortedYears = [...years].sort((a, b) => b - a);
      const periods = sortedYears.map((year) => ({
        year,
        months: (monthsByYear.get(year) ?? [])
          .sort((a, b) => a - b)
          .map((month) => ({
            month,
            label: monthLabel(month),
          })),
      }));

      return NextResponse.json({ success: true, periods });
    }

    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    if (yearParam != null && monthParam != null) {
      const year = parseInt(yearParam, 10);
      const month = parseInt(monthParam, 10);
      if (!Number.isFinite(year) || !Number.isFinite(month) || month < 0 || month > 11) {
        return NextResponse.json(
          { success: false, message: "Invalid year or month" },
          { status: 400 },
        );
      }

      const records = await getMonthAttendance(
        employee.attendanceSpreadsheetId,
        year,
        month,
      );

      return NextResponse.json({
        success: true,
        records: records.map((r) => ({
          id: r.date,
          date: r.date,
          punchIn: r.punchIn,
          punchOut: r.punchOut,
          breakTime: r.totalBreakTime,
          workingHours: r.workingHours,
          overtime: r.overtime,
          status: r.status,
          earlyLeaveReason: r.earlyLeaveReason,
        })),
      });
    }

    const today = await getTodayAttendance(employee.attendanceSpreadsheetId);
    const workedMs = today ? computeLiveWorkedMs(today) : 0;
    const idealMs = IDEAL_WORKING_HOURS * 60 * 60 * 1000;
    const remainingMs = Math.max(0, idealMs - workedMs);
    const onBreak = Boolean(today?.breakStart?.trim() && !today?.breakEnd?.trim());
    let breakUsedMs = today ? parseDurationToMs(today.totalBreakTime) : 0;
    if (today && onBreak && today.breakStart) {
      const breakStartMs = parseTimeOnDate(today.breakStart, new Date(today.date));
      if (breakStartMs != null) {
        breakUsedMs += Math.max(0, Date.now() - breakStartMs);
      }
    }

    return NextResponse.json({
      success: true,
      today: today
        ? {
            date: today.date,
            punchIn: today.punchIn,
            punchOut: today.punchOut,
            breakStart: today.breakStart,
            breakEnd: today.breakEnd,
            totalBreakTime: today.totalBreakTime,
            workingHours: today.workingHours,
            overtime: today.punchOut.trim() ? today.overtime : "—",
            status: today.status,
            onBreak,
            hasPunchedIn: Boolean(today.punchIn?.trim()),
            hasPunchedOut: Boolean(today.punchOut?.trim()),
            workedMs,
            workedFormatted: formatDurationHms(workedMs),
            workedShort: formatDuration(workedMs),
            idealHours: IDEAL_WORKING_HOURS,
            idealBreakHours: IDEAL_BREAK_HOURS,
            idealShiftHours: IDEAL_SHIFT_HOURS,
            remainingMs,
            remainingFormatted: formatDuration(remainingMs),
            breakAllowanceFormatted: formatBreakAllowance(breakUsedMs),
            earlyLeaveReason: today.earlyLeaveReason ?? "",
          }
        : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load attendance";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
});

export const POST = withActiveSession(async (req, user) => {
  try {
    const employee = await resolveAttendanceEmployeeForTarget(user, user.sheetRow);
    if (!employee?.attendanceSpreadsheetId) {
      return NextResponse.json(
        { success: false, message: "Employee attendance record not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const action = String(body.action ?? "");
    const earlyLeaveReason =
      typeof body.earlyLeaveReason === "string" ? body.earlyLeaveReason.trim() : "";

    if (action === "punch-out" && earlyLeaveReason.length > 0) {
      if (earlyLeaveReason.length < EARLY_LEAVE_REASON_MIN_LENGTH) {
        return NextResponse.json(
          {
            success: false,
            message: `Early leave reason must be at least ${EARLY_LEAVE_REASON_MIN_LENGTH} characters`,
          },
          { status: 400 },
        );
      }
    }

    let record;
    switch (action) {
      case "punch-in":
        record = await punchIn(employee.attendanceSpreadsheetId);
        break;
      case "punch-out":
        record = await punchOut(employee.attendanceSpreadsheetId, new Date(), {
          earlyLeaveReason: earlyLeaveReason || undefined,
        });
        break;
      case "break-start":
        record = await startBreak(employee.attendanceSpreadsheetId);
        break;
      case "break-end":
        record = await endBreak(employee.attendanceSpreadsheetId);
        break;
      default:
        return NextResponse.json(
          { success: false, message: "Invalid action" },
          { status: 400 },
        );
    }

    const workedMs = computeLiveWorkedMs(record);

    return NextResponse.json({
      success: true,
      record: {
        date: record.date,
        punchIn: record.punchIn,
        punchOut: record.punchOut,
        breakStart: record.breakStart,
        breakEnd: record.breakEnd,
        totalBreakTime: record.totalBreakTime,
        workingHours: record.workingHours,
        overtime: record.overtime,
        status: record.status,
        onBreak: Boolean(record.breakStart?.trim() && !record.breakEnd?.trim()),
        hasPunchedIn: Boolean(record.punchIn?.trim()),
        hasPunchedOut: Boolean(record.punchOut?.trim()),
        workedMs,
        workedFormatted: formatDurationHms(workedMs),
        earlyLeaveReason: record.earlyLeaveReason ?? "",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Attendance action failed";
    const status =
      message.includes("Already") ||
      message.includes("first") ||
      message.includes("break") ||
      message.includes("reason")
        ? 400
        : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
});

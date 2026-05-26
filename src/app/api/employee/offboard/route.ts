import { NextRequest, NextResponse } from "next/server";

import { STATUS } from "@/app/consts/common";
import { canManageEmployees, getSessionUser } from "@/lib/auth/server";
import {
  formToSheetRow,
  getSheetHeaders,
  sheetRowToForm,
  sheetRowToRange,
} from "@/lib/employee";
import { readSheet, updateSheetRow } from "@/lib/google/sheets";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !canManageEmployees(user.role)) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to offboard employees." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const sheetRow = Number(body.sheetRow);
    const lastWorkingDay = String(body.lastWorkingDay ?? "").trim();
    const reason = String(body.reason ?? "").trim();

    if (!Number.isFinite(sheetRow) || sheetRow < 2) {
      return NextResponse.json(
        { success: false, message: "A valid employee is required." },
        { status: 400 },
      );
    }

    if (!lastWorkingDay) {
      return NextResponse.json(
        { success: false, message: "Last working day is required." },
        { status: 400 },
      );
    }

    if (!reason) {
      return NextResponse.json(
        { success: false, message: "Offboarding reason is required." },
        { status: 400 },
      );
    }

    const raw = await readSheet("Sheet1!A1:Z1000");
    if (sheetRow > raw.length) {
      return NextResponse.json(
        { success: false, message: "Employee not found." },
        { status: 404 },
      );
    }

    const headers = getSheetHeaders(raw);
    const row = raw[sheetRow - 1] ?? [];
    const form = sheetRowToForm(headers, row);

    form.status = STATUS.INACTIVE;
    form.lastWorkingDay = lastWorkingDay;
    form.offboardReason = reason;

    const rowValues = formToSheetRow(form, headers);
    const updateRange = sheetRowToRange(sheetRow, headers.length);
    await updateSheetRow(updateRange, [rowValues]);

    return NextResponse.json({
      success: true,
      message: "Employee offboarded successfully.",
    });
  } catch (error: unknown) {
    console.error("Offboard employee error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to offboard employee.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

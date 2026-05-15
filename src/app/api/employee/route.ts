// app/api/sheet/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
    readSheet,
    appendSheetRow,
    updateSheetRow,
    clearSheetRange,
} from "@/lib/googleSheet";
import { type SortOrder } from "@/lib/sheetSort";
import { DEFAULT_PAGE_SIZE } from "@/lib/sheetPagination";
import { processEmployeeSheet } from "@/lib/employeeSheetRows";
import { getSheetHeaders, sheetRowToRange } from "@/lib/employeeForm";

/**
 * GET
 * Read sheet data
 *
 * Example:
 * /api/sheet?range=Sheet1!A1:E20
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const range =
            searchParams.get("range") || "Sheet1!A1:Z1000";

        const sortBy = searchParams.get("sortBy");
        const orderParam = searchParams.get("order");
        const order: SortOrder =
            orderParam === "desc" ? "desc" : "asc";

        const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
        const pageSize = Math.min(
            100,
            Math.max(1, parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
        );

        const search = searchParams.get("search")?.trim() ?? "";
        const status = searchParams.get("status")?.trim() ?? "";
        const rowParam = searchParams.get("row");
        const headersOnly = searchParams.get("headersOnly") === "true";

        if (headersOnly) {
            const headerRow = await readSheet("Sheet1!1:1");
            const headers = getSheetHeaders(headerRow.length ? headerRow : [[]]);

            return NextResponse.json(
                { success: true, headers },
                { status: 200 },
            );
        }

        const raw = await readSheet(range);

        if (rowParam) {
            const sheetRow = parseInt(rowParam, 10);
            if (!Number.isFinite(sheetRow) || sheetRow < 2 || sheetRow > raw.length) {
                return NextResponse.json(
                    { success: false, message: "Employee not found" },
                    { status: 404 },
                );
            }

            const headers = getSheetHeaders(raw);
            return NextResponse.json(
                {
                    success: true,
                    headers,
                    row: raw[sheetRow - 1] ?? [],
                    sheetRow,
                },
                { status: 200 },
            );
        }

        const { data, sheetRows, pagination } = processEmployeeSheet({
            data: raw,
            search,
            status,
            sortBy,
            order,
            page,
            pageSize,
        });

        return NextResponse.json(
            {
                success: true,
                data,
                sheetRows,
                pagination,
                sort: sortBy ? { sortBy, order } : null,
                search: search || null,
                status: status || null,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("GET Sheet Error:", error);

        return NextResponse.json(
            {
                success: false,
                message: error.message || "Failed to fetch sheet data",
            },
            { status: 500 }
        );
    }
}

/**
 * POST
 * Append new row
 *
 * Body:
 * {
 *   "values": [
 *     ["RK", "Developer", "India"]
 *   ]
 * }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const { values } = body;

        if (!values || !Array.isArray(values)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "values array is required",
                },
                { status: 400 }
            );
        }

        const response = await appendSheetRow(values);

        return NextResponse.json(
            {
                success: true,
                data: response,
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("POST Sheet Error:", error);

        return NextResponse.json(
            {
                success: false,
                message: error.message || "Failed to append row",
            },
            { status: 500 }
        );
    }
}

/**
 * PUT
 * Update specific range
 *
 * Body:
 * {
 *   "range": "Sheet1!A2:C2",
 *   "values": [
 *     ["Updated", "Data", "Here"]
 *   ]
 * }
 */
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();

        const { range, values, sheetRow } = body;

        if (!values || !Array.isArray(values)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "values array is required",
                },
                { status: 400 }
            );
        }

        let updateRange = range;
        if (!updateRange && sheetRow) {
            const rowValues = values[0] as string[] | undefined;
            const colCount = rowValues?.length ?? 1;
            updateRange = sheetRowToRange(Number(sheetRow), colCount);
        }

        if (!updateRange) {
            return NextResponse.json(
                {
                    success: false,
                    message: "range or sheetRow is required",
                },
                { status: 400 }
            );
        }

        const response = await updateSheetRow(updateRange, values);

        return NextResponse.json(
            {
                success: true,
                data: response,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("PUT Sheet Error:", error);

        return NextResponse.json(
            {
                success: false,
                message: error.message || "Failed to update sheet",
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE
 * Clear sheet range
 *
 * Body:
 * {
 *   "range": "Sheet1!A2:C10"
 * }
 */
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();

        const { range } = body;

        if (!range) {
            return NextResponse.json(
                {
                    success: false,
                    message: "range is required",
                },
                { status: 400 }
            );
        }

        const response = await clearSheetRange(range);

        return NextResponse.json(
            {
                success: true,
                data: response,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("DELETE Sheet Error:", error);

        return NextResponse.json(
            {
                success: false,
                message: error.message || "Failed to clear range",
            },
            { status: 500 }
        );
    }
}
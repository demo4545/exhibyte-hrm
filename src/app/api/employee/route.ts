// app/api/sheet/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
    readSheet,
    appendSheetRow,
    updateSheetRow,
    clearSheetRange,
    getEmployeeCount,
    getSheetHeadersData
} from "@/lib/google/sheets";
import {
    createEmployeeFolderStructure,
    uploadEmployeeDocuments,
} from "@/lib/google/drive";
import {
    type SortOrder,
    DEFAULT_PAGE_SIZE,
    processEmployeeSheet,
    getSheetHeaders,
    sheetRowToRange,
    generateEmployeeId,
    getEmployeeNameFromRow,
    getEmployeeIdFromRow,
    headerToFormKey,
    mergeRowWithFormFields,
} from "@/lib/employee";
import {
    filesToUploadBuffers,
    parseEmployeeSubmit,
} from "@/lib/employee/server";

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

export async function POST(req: Request) {
    try {
        const { values, files } = await parseEmployeeSubmit(req);

        const headers = await getSheetHeadersData();

        // Get employee count
        const totalEmployees = await getEmployeeCount();

        // Generate employee ID
        const employeeId = generateEmployeeId(totalEmployees);

        const employeeName = getEmployeeNameFromRow(headers, values);

        // Create Drive folders
        const folders = await createEmployeeFolderStructure(
            employeeId,
            employeeName,
        );

        const documentsFolderId = folders.documentsFolderId;
        if (!documentsFolderId) {
            throw new Error("Failed to create employee documents folder");
        }

        const rowValues = mergeRowWithFormFields(headers, values, {
            employeeId,
            documentsFolderId,
        });

        await appendSheetRow([rowValues]);

        const newSheetRow = totalEmployees + 2;
        const fileBuffers = await filesToUploadBuffers(files);
        let documentWarning: string | undefined;

        if (Object.keys(fileBuffers).length > 0) {
            try {
                const documentLinks = await uploadEmployeeDocuments(
                    documentsFolderId,
                    fileBuffers,
                );

                if (Object.keys(documentLinks).length > 0) {
                    const rowWithDocs = mergeRowWithFormFields(
                        headers,
                        rowValues,
                        documentLinks,
                    );
                    await updateSheetRow(
                        sheetRowToRange(newSheetRow, headers.length),
                        [rowWithDocs],
                    );
                }
            } catch (uploadError: any) {
                console.error(
                    "UPLOAD ERROR FULL:",
                    JSON.stringify(uploadError, null, 2)
                );

                console.error(
                    "UPLOAD ERROR MESSAGE:",
                    uploadError?.message
                );

                console.error(
                    "UPLOAD ERROR RESPONSE:",
                    uploadError?.response?.data
                );

                documentWarning =
                    uploadError instanceof Error
                        ? uploadError.message
                        : "Document upload failed";
            }
        }

        return Response.json({
            success: true,
            message: documentWarning
                ? `Employee saved, but documents could not be uploaded: ${documentWarning}`
                : "Employee created successfully",
            documentWarning: documentWarning ?? null,
        });
    } catch (error: any) {
        console.error(error);

        return Response.json(
            {
                success: false,
                message: error.message,
            },
            {
                status: 500,
            }
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
        const contentType = req.headers.get("content-type") ?? "";
        let range: string | undefined;
        let values: string[][];
        let sheetRow: number | undefined;

        if (contentType.includes("multipart/form-data")) {
            const payload = await parseEmployeeSubmit(req);
            sheetRow = payload.sheetRow;
            values = [payload.values];

            const headers = await getSheetHeadersData();
            const docColIndex = headers.findIndex(
                (h) => headerToFormKey(h) === "documentsFolderId",
            );
            let documentsFolderId =
                docColIndex >= 0
                    ? String(payload.values[docColIndex] ?? "").trim()
                    : "";

            let rowValues = payload.values;

            if (Object.keys(payload.files).length > 0) {
                if (!documentsFolderId) {
                    const employeeId = getEmployeeIdFromRow(
                        headers,
                        payload.values,
                        sheetRow,
                    );
                    if (!employeeId) {
                        return NextResponse.json(
                            {
                                success: false,
                                message:
                                    "Employee ID is required to create a documents folder",
                            },
                            { status: 400 },
                        );
                    }

                    const employeeName = getEmployeeNameFromRow(
                        headers,
                        payload.values,
                    );
                    const folders = await createEmployeeFolderStructure(
                        employeeId,
                        employeeName,
                    );
                    documentsFolderId = folders.documentsFolderId ?? "";
                    if (!documentsFolderId) {
                        return NextResponse.json(
                            {
                                success: false,
                                message:
                                    "Failed to create employee documents folder",
                            },
                            { status: 500 },
                        );
                    }

                    rowValues = mergeRowWithFormFields(headers, payload.values, {
                        documentsFolderId,
                    });
                }

                const documentLinks = await uploadEmployeeDocuments(
                    documentsFolderId,
                    await filesToUploadBuffers(payload.files),
                );

                rowValues = mergeRowWithFormFields(
                    headers,
                    rowValues,
                    documentLinks,
                );
            }

            values = [rowValues];
        } else {
            const body = await req.json();
            range = body.range;
            values = body.values;
            sheetRow = body.sheetRow != null ? Number(body.sheetRow) : undefined;
        }

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
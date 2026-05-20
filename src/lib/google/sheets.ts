import { getSheetHeaders } from "@/lib/employee";
import { sheets } from "./auth";

const spreadsheetId = process.env.GOOGLE_SHEET_ID as string;

export const getSheetHeadersData = async () => {
    const rows = await readSheet("Sheet1");

    return getSheetHeaders(rows);
};

/**
 * Read Sheet Data
 */
export const readSheet = async (
    range: string = "Sheet1"
) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        return response.data.values || [];
    } catch (error) {
        console.error("Read Sheet Error:", error);
        throw error;
    }
};

/**
 * Append Rows
 */
export const appendSheetRow = async (
    values: (string | number)[][]
) => {
    try {
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: "Sheet1",
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values,
            },
        });

        return response.data;
    } catch (error) {
        console.error("Append Row Error:", error);
        throw error;
    }
};

/**
 * Update Rows
 */
export const updateSheetRow = async (
    range: string,
    values: (string | number)[][]
) => {
    try {
        const response = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values,
            },
        });

        return response.data;
    } catch (error) {
        console.error("Update Sheet Error:", error);
        throw error;
    }
};

/**
 * Clear Range
 */
export const clearSheetRange = async (
    range: string
) => {
    try {
        const response = await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range,
        });

        return response.data;
    } catch (error) {
        console.error("Clear Sheet Error:", error);
        throw error;
    }
};

export const getEmployeeCount = async () => {
    const rows = await readSheet("Sheet1");

    // remove header row
    return Math.max(rows.length - 1, 0);
};
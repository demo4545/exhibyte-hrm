import { Readable } from "node:stream";

import {
    driveFileNameForField,
    EMPLOYEE_DOCUMENT_FIELDS,
    type EmployeeDocumentField,
} from "@/lib/employee/documents";

import { formatDriveError, getDrive } from "./drive-auth";

const HRM_FOLDER_ID = process.env.GOOGLE_HRM_FOLDER_ID!;

const SHARED_DRIVE_OPTIONS = {
    supportsAllDrives: true,
} as const;

export type { EmployeeDocumentField };
export { EMPLOYEE_DOCUMENT_FIELDS };

export async function uploadFileToFolder(
    fileName: string,
    mimeType: string,
    buffer: Buffer,
    parentFolderId: string,
): Promise<string> {
    const drive = await getDrive();

    try {
        const response = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [parentFolderId],
            },
            media: {
                mimeType: mimeType || "application/octet-stream",
                body: Readable.from(buffer),
            },
            fields: "id, webViewLink",
            ...SHARED_DRIVE_OPTIONS,
        });

        const fileId = response.data.id;
        return (
            response.data.webViewLink ??
            (fileId ? `https://drive.google.com/file/d/${fileId}/view` : fileName)
        );
    } catch (error) {
        throw formatDriveError(error);
    }
}

export async function uploadEmployeeDocuments(
    documentsFolderId: string,
    files: Partial<
        Record<
            EmployeeDocumentField,
            { name: string; type: string; buffer: Buffer }
        >
    >,
): Promise<Partial<Record<EmployeeDocumentField, string>>> {
    const links: Partial<Record<EmployeeDocumentField, string>> = {};

    for (const field of EMPLOYEE_DOCUMENT_FIELDS) {
        const file = files[field];
        if (!file) continue;

        links[field] = await uploadFileToFolder(
            driveFileNameForField(field, file.name, file.type),
            file.type,
            file.buffer,
            documentsFolderId,
        );
    }

    return links;
}

const DOCUMENTS_ROOT_FOLDER_NAME = "documents";

export const createFolder = async (name: string, parentFolderId?: string) => {
    const drive = await getDrive();

    try {
        const response = await drive.files.create({
            requestBody: {
                name,
                mimeType: "application/vnd.google-apps.folder",
                parents: parentFolderId ? [parentFolderId] : [HRM_FOLDER_ID],
            },
            fields: "id,name",
            ...SHARED_DRIVE_OPTIONS,
        });

        return response.data;
    } catch (error) {
        throw formatDriveError(error);
    }
};

async function getOrCreateFolder(
    name: string,
    parentFolderId: string,
): Promise<string> {
    const drive = await getDrive();

    const query = [
        "mimeType = 'application/vnd.google-apps.folder'",
        "trashed = false",
        `name = '${name.replace(/'/g, "\\'")}'`,
        `'${parentFolderId}' in parents`,
    ].join(" and ");

    try {
        const list = await drive.files.list({
            q: query,
            fields: "files(id)",
            pageSize: 1,
            ...SHARED_DRIVE_OPTIONS,
        });

        const existingId = list.data.files?.[0]?.id;
        if (existingId) return existingId;

        const created = await createFolder(name, parentFolderId);
        if (!created.id) {
            throw new Error(`Failed to create folder: ${name}`);
        }
        return created.id;
    } catch (error) {
        throw formatDriveError(error);
    }
}

export const createEmployeeFolderStructure = async (
    employeeId: string,
    employeeName: string,
) => {
    const documentsRootId = await getOrCreateFolder(
        DOCUMENTS_ROOT_FOLDER_NAME,
        HRM_FOLDER_ID,
    );

    const employeeFolderName = `${employeeId}_${employeeName}`;
    const employeeFolderId = await getOrCreateFolder(
        employeeFolderName,
        documentsRootId,
    );

    const documentsFolderId = await getOrCreateFolder(
        "documents",
        employeeFolderId,
    );

    return { documentsFolderId };
};

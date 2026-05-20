import { NextResponse } from "next/server";

import {
    isDriveOAuthConfigured,
    isDriveOAuthConnected,
} from "@/lib/google/drive-auth";
import { isDriveImpersonationEnabled } from "@/lib/google/auth";

export async function GET() {
    const oauthConnected = await isDriveOAuthConnected();

    return NextResponse.json({
        success: true,
        oauthConfigured: isDriveOAuthConfigured(),
        oauthConnected,
        impersonation: isDriveImpersonationEnabled(),
        driveReady: oauthConnected || isDriveImpersonationEnabled(),
    });
}

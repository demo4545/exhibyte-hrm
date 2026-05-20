import { NextRequest, NextResponse } from "next/server";

/** Alias for /auth — some UIs link here. */
export async function GET(req: NextRequest) {
    return NextResponse.redirect(
        new URL("/api/integrations/google-drive/auth", req.url),
    );
}

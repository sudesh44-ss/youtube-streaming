import { NextRequest, NextResponse } from "next/server";
import { isDevEnvironment, verifyDevAdminCredentials, handleDevAdminLogin } from "@/lib/dev-auth";
import { logSecurityEvent } from "@/lib/auth";

export async function POST(req: NextRequest) {
  // Completely disabled in production builds and deployments
  if (!isDevEnvironment()) {
    return NextResponse.json(
      { error: "Development-only endpoint is disabled in production." },
      { status: 404 }
    );
  }

  try {
    const body = await req.json();
    const { email, password } = body;

    const userAgent = req.headers.get("user-agent") || undefined;
    const ip = req.headers.get("x-forwarded-for") || undefined;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Both email and password are required." },
        { status: 400 }
      );
    }

    if (!verifyDevAdminCredentials(email, password)) {
      logSecurityEvent(
        null,
        "DEV_ADMIN_LOGIN_FAILED",
        `Failed dev admin login attempt for ${email}`,
        ip,
        userAgent
      );
      return NextResponse.json(
        { error: "Invalid development admin credentials." },
        { status: 401 }
      );
    }

    const result = await handleDevAdminLogin({ userAgent, ip });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Dev admin authentication error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during dev admin login." },
      { status: 500 }
    );
  }
}

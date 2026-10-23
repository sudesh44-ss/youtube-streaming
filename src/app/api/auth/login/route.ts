import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword, createSession, setSessionCookie, logSecurityEvent } from "@/lib/auth";
import { isDevEnvironment, isDevAdminAttempt, verifyDevAdminCredentials, handleDevAdminLogin } from "@/lib/dev-auth";
import { checkRateLimit, getClientIp, rateLimitExceededResponse, RATE_LIMIT_POLICIES } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit(ip, RATE_LIMIT_POLICIES.LOGIN);
    if (!rateCheck.success) {
      logSecurityEvent(null, "RATE_LIMIT_EXCEEDED", `Login rate limit exceeded for ${ip}`);
      return rateLimitExceededResponse(rateCheck);
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Please provide both email and password." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userAgent = req.headers.get("user-agent") || undefined;

    // Development-Only Testing Authentication Path
    if (isDevEnvironment() && isDevAdminAttempt(normalizedEmail)) {
      if (verifyDevAdminCredentials(normalizedEmail, password)) {
        const devLoginResult = await handleDevAdminLogin({ userAgent, ip });
        return NextResponse.json(devLoginResult);
      } else {
        logSecurityEvent(null, "DEV_ADMIN_LOGIN_FAILED", `Invalid dev admin credentials for ${normalizedEmail}`, ip, userAgent);
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }
    }

    const db = getDb();
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail) as any;

    if (!user) {
      logSecurityEvent(null, "LOGIN_FAILED", `Unknown email: ${normalizedEmail}`, ip, userAgent);
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const isMatch = verifyPassword(password, user.password_hash, user.salt);
    if (!isMatch) {
      logSecurityEvent(user.id, "LOGIN_FAILED", "Bad password attempt", ip, userAgent);
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Create session
    const rawToken = createSession(user.id, userAgent, ip);
    await setSessionCookie(rawToken);

    logSecurityEvent(user.id, "LOGIN_SUCCESS", "Session created", ip, userAgent);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: Boolean(user.email_verified),
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "An unexpected error occurred during login." }, { status: 500 });
  }
}

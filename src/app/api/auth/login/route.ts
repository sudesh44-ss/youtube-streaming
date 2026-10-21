import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword, createSession, setSessionCookie, logSecurityEvent } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Please provide both email and password." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail) as any;

    const userAgent = req.headers.get("user-agent") || undefined;
    const ip = req.headers.get("x-forwarded-for") || undefined;

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

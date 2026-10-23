import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, verifyPassword, hashPassword, validatePasswordStrength, logSecurityEvent } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkRateLimit, getClientIp, rateLimitExceededResponse, RATE_LIMIT_POLICIES } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const identifier = `${session.user.id}:${ip}`;
    const rateCheck = await checkRateLimit(identifier, RATE_LIMIT_POLICIES.PASSWORD_CHANGE);
    if (!rateCheck.success) {
      logSecurityEvent(session.user.id, "RATE_LIMIT_EXCEEDED", `Password change rate limit exceeded for ${ip}`);
      return rateLimitExceededResponse(rateCheck);
    }

    const { currentPassword, newPassword, confirmPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "All password fields are required." }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "New passwords do not match." }, { status: 400 });
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return NextResponse.json({ error: strength.message }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.user.id) as any;

    if (!user || !verifyPassword(currentPassword, user.password_hash, user.salt)) {
      return NextResponse.json({ error: "Current password does not match our records." }, { status: 400 });
    }

    const { hash, salt } = hashPassword(newPassword);
    db.prepare("UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?").run(
      hash,
      salt,
      Date.now(),
      user.id
    );

    logSecurityEvent(session.user.id, "PASSWORD_CHANGED", "User changed password from Settings");

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

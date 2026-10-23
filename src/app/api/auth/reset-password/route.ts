import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, validatePasswordStrength, logSecurityEvent } from "@/lib/auth";
import { hashToken } from "@/lib/crypto";
import { checkRateLimit, getClientIp, rateLimitExceededResponse, RATE_LIMIT_POLICIES } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit(ip, RATE_LIMIT_POLICIES.PASSWORD_RESET);
    if (!rateCheck.success) {
      logSecurityEvent(null, "RATE_LIMIT_EXCEEDED", `Password reset rate limit exceeded for ${ip}`);
      return rateLimitExceededResponse(rateCheck);
    }

    const { token, newPassword, confirmPassword } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Reset token is required." }, { status: 400 });
    }

    if (!newPassword || newPassword !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match or are empty." }, { status: 400 });
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return NextResponse.json({ error: strength.message }, { status: 400 });
    }

    const db = getDb();
    const now = Date.now();
    const tokenHash = hashToken(token.trim());

    const user = db.prepare(`
      SELECT id FROM users
      WHERE reset_token = ? AND reset_token_expires > ?
    `).get(tokenHash, now) as any;

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset token." }, { status: 400 });
    }

    const { hash, salt } = hashPassword(newPassword);

    db.prepare(`
      UPDATE users
      SET password_hash = ?, salt = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = ?
      WHERE id = ?
    `).run(hash, salt, now, user.id);

    // Invalidate existing sessions for security
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);

    logSecurityEvent(user.id, "PASSWORD_RESET_SUCCESS", "Password reset with hashed token");

    return NextResponse.json({
      success: true,
      message: "Password has been successfully updated. You may now sign in.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

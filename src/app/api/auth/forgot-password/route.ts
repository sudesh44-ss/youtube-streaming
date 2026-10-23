import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { isValidEmail, logSecurityEvent } from "@/lib/auth";
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

    const { email } = await req.json();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail) as any;

    if (user) {
      const rawResetToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = hashToken(rawResetToken);
      const expires = Date.now() + 60 * 60 * 1000; // 1 hour

      db.prepare("UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?").run(
        hashedToken,
        expires,
        user.id
      );

      logSecurityEvent(user.id, "PASSWORD_RESET_REQUESTED", "Hashed reset token issued");
      // In production with an email provider (e.g. Supabase Auth / Resend / SendGrid), 
      // the rawResetToken is sent via email to the user.
    }

    // Generic safe response to prevent account enumeration and token leakage
    return NextResponse.json({
      success: true,
      message: "If an account exists with this email address, password reset instructions have been sent.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "An error occurred while processing your request." }, { status: 500 });
  }
}

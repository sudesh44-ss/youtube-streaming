import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { isValidEmail, logSecurityEvent } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail) as any;

    let resetToken = null;
    if (user) {
      resetToken = crypto.randomBytes(24).toString("hex");
      const expires = Date.now() + 60 * 60 * 1000; // 1 hour

      db.prepare("UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?").run(
        resetToken,
        expires,
        user.id
      );

      logSecurityEvent(user.id, "PASSWORD_RESET_REQUESTED", "Reset token issued");
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, instructions have been generated.",
      // Return resetToken so user can complete password reset without external email server configuration
      resetToken: resetToken || undefined,
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "An error occurred while processing your request." }, { status: 500 });
  }
}

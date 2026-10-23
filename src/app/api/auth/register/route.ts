import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { hashPassword, validatePasswordStrength, isValidEmail, createSession, setSessionCookie, logSecurityEvent, TERMS_VERSION, PRIVACY_VERSION } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitExceededResponse, RATE_LIMIT_POLICIES } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit(ip, RATE_LIMIT_POLICIES.REGISTER);
    if (!rateCheck.success) {
      logSecurityEvent(null, "RATE_LIMIT_EXCEEDED", `Registration rate limit exceeded for ${ip}`);
      return rateLimitExceededResponse(rateCheck);
    }

    const body = await req.json();
    const { name, email, password, confirmPassword, acceptTerms, acknowledgePrivacy } = body;

    // Field-level validations
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Please enter your full name (at least 2 characters)." }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return NextResponse.json({ error: strength.message }, { status: 400 });
    }

    if (!acceptTerms || !acknowledgePrivacy) {
      return NextResponse.json(
        { error: "You must accept the Terms & Conditions and acknowledge the Privacy Policy to create an account." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();

    // Check if email already exists
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
    if (existing) {
      // Security: avoid revealing duplicate accounts with an overly specific message
      return NextResponse.json(
        { error: "An account with this email address already exists. Please sign in or use password reset." },
        { status: 409 }
      );
    }

    const userId = crypto.randomUUID();
    const { hash, salt } = hashPassword(password);
    const now = Date.now();

    // Insert user
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(userId, normalizedEmail, hash, salt, name.trim(), now, now);

    // Record Legal Acceptance
    const acceptanceId = crypto.randomUUID();
    const userAgent = req.headers.get("user-agent") || undefined;

    db.prepare(`
      INSERT INTO legal_acceptance (id, user_id, terms_version, privacy_version, accepted_at, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(acceptanceId, userId, TERMS_VERSION, PRIVACY_VERSION, now, userAgent || null);

    // Initialize Default Preferences
    db.prepare(`
      INSERT INTO user_preferences (user_id, display_name, default_mode, preferred_categories, preferred_languages, theme, updated_at)
      VALUES (?, ?, 'normal', '["study","technology","music","movies"]', '["en"]', 'system', ?)
    `).run(userId, name.trim(), now);

    // Create session and set cookie
    const rawToken = createSession(userId, userAgent, ip);
    await setSessionCookie(rawToken);

    logSecurityEvent(userId, "REGISTER_SUCCESS", `Account created for ${normalizedEmail}`, ip, userAgent);

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: normalizedEmail,
        name: name.trim(),
        emailVerified: true,
      },
    });
  } catch (err: any) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "An unexpected error occurred during registration. Please try again." }, { status: 500 });
  }
}

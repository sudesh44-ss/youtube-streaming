import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isValidEmail, validatePasswordStrength, logSecurityEvent, TERMS_VERSION, PRIVACY_VERSION } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitExceededResponse, RATE_LIMIT_POLICIES } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

    // Field-level validations (same as before) ...
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
      return NextResponse.json({ error: "You must accept the Terms & Conditions and acknowledge the Privacy Policy to create an account." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { name: name.trim() },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "https://tubify.sudeshcreation.shop"}/auth/verify-otp?email=${encodeURIComponent(normalizedEmail)}`,
      },
    });
    if (error) {
      // Supabase returns a user if they already exist – treat as duplicate
      const msg = error.message.includes("already exists") ? "An account with this email address already exists. Please sign in or use password reset." : error.message;
      return NextResponse.json({ error: msg }, { status: error.status || 400 });
    }
    // Record legal acceptance locally (still using SQLite) – user id will be in Supabase data.user?.id later
    const now = Date.now();
    const userAgent = req.headers.get("user-agent") || undefined;
    const acceptanceId = crypto.randomUUID();
    const db = getDb();
    db.prepare(`
      INSERT INTO legal_acceptance (id, user_id, terms_version, privacy_version, accepted_at, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(acceptanceId, data?.user?.id ?? crypto.randomUUID(), TERMS_VERSION, PRIVACY_VERSION, now, userAgent || null);

    // Initialize default preferences (store locally, linking to Supabase user id)
    db.prepare(`
      INSERT INTO user_preferences (user_id, display_name, default_mode, preferred_categories, preferred_languages, theme, updated_at)
      VALUES (?, ?, 'normal', '["study","technology","music","movies"]', '["en"]', 'system', ?)
    `).run(data?.user?.id ?? crypto.randomUUID(), name.trim(), now);

    // No session cookie yet – user must verify email first
    logSecurityEvent(data?.user?.id ?? "unknown", "REGISTER_SUCCESS", `Account created for ${normalizedEmail}`, ip, userAgent);
    return NextResponse.json({ success: true, message: "Verification email sent. Please check your inbox." });
  } catch (err: any) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "An unexpected error occurred during registration. Please try again." }, { status: 500 });
  }
}

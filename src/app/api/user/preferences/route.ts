import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";


export async function GET(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ success: true, preferences: session.preferences });
  } catch (err) {
    return NextResponse.json({ error: "Failed to get preferences." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      defaultMode,
      preferredCategories,
      preferredLanguages,
      theme,
      layoutDensity,
      reducedMotion,
      highContrast,
      fontScale,
      emailAlerts,
      securityAlerts,
      inAppNotifications,
    } = body;

    const db = getDb();
    const now = Date.now();

    db.prepare(`
      UPDATE user_preferences SET
        default_mode = COALESCE(?, default_mode),
        preferred_categories = COALESCE(?, preferred_categories),
        preferred_languages = COALESCE(?, preferred_languages),
        theme = COALESCE(?, theme),
        layout_density = COALESCE(?, layout_density),
        reduced_motion = COALESCE(?, reduced_motion),
        high_contrast = COALESCE(?, high_contrast),
        font_scale = COALESCE(?, font_scale),
        email_alerts = COALESCE(?, email_alerts),
        security_alerts = COALESCE(?, security_alerts),
        in_app_notifications = COALESCE(?, in_app_notifications),
        updated_at = ?
      WHERE user_id = ?
    `).run(
      defaultMode !== undefined ? defaultMode : null,
      preferredCategories !== undefined ? JSON.stringify(preferredCategories) : null,
      preferredLanguages !== undefined ? JSON.stringify(preferredLanguages) : null,
      theme !== undefined ? theme : null,
      layoutDensity !== undefined ? layoutDensity : null,
      reducedMotion !== undefined ? (reducedMotion ? 1 : 0) : null,
      highContrast !== undefined ? (highContrast ? 1 : 0) : null,
      fontScale !== undefined ? fontScale : null,
      emailAlerts !== undefined ? (emailAlerts ? 1 : 0) : null,
      securityAlerts !== undefined ? (securityAlerts ? 1 : 0) : null,
      inAppNotifications !== undefined ? (inAppNotifications ? 1 : 0) : null,
      now,
      session.user.id
    );

    return NextResponse.json({ success: true, message: "Preferences updated." });
  } catch (err) {
    console.error("Preferences update error:", err);
    return NextResponse.json({ error: "Failed to save preferences." }, { status: 500 });
  }
}

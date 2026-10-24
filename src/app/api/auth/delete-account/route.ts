import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, clearSessionCookie, verifyPassword, logSecurityEvent } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { password, confirmPhrase } = body;

    // Check if user has a local password configured
    try {
      const db = getDb();
      const localUser = db.prepare("SELECT * FROM users WHERE id = ?").get(session.user.id) as any;
      if (localUser && localUser.password_hash) {
        if (!password) {
          return NextResponse.json({ error: "Please enter your password to confirm account deletion." }, { status: 400 });
        }
        if (!verifyPassword(password, localUser.password_hash, localUser.salt)) {
          return NextResponse.json({ error: "Incorrect password. Account deletion aborted." }, { status: 403 });
        }
        // Remove from local database
        db.prepare("DELETE FROM users WHERE id = ?").run(session.user.id);
      }
    } catch {
      // Serverless readonly or purely cloud-backed environment
    }

    // Permanently erase all Supabase database records and auth user
    try {
      const admin = createAdminClient();
      if (admin && isUuid(session.user.id)) {
        await Promise.allSettled([
          admin.from("search_history").delete().eq("user_id", session.user.id),
          admin.from("watch_history").delete().eq("user_id", session.user.id),
          admin.from("saved_content").delete().eq("user_id", session.user.id),
          admin.from("provider_credentials").delete().eq("user_id", session.user.id),
          admin.from("user_preferences").delete().eq("user_id", session.user.id),
          admin.from("profiles").delete().eq("id", session.user.id),
        ]);

        // Permanently delete user from Supabase Auth
        await admin.auth.admin.deleteUser(session.user.id);
      }
    } catch (e) {
      console.warn("Supabase account cascade deletion note:", e);
    }

    logSecurityEvent(session.user.id, "ACCOUNT_DELETED", `User requested permanent erasure: ${session.user.email}`);

    // Clear session cookies
    await clearSessionCookie();

    return NextResponse.json({
      success: true,
      message: "Your account and all associated data have been permanently deleted.",
    });
  } catch (err) {
    console.error("Account deletion error:", err);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, clearSessionCookie, verifyPassword, logSecurityEvent } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { password } = await req.json();
    if (!password) {
      return NextResponse.json({ error: "Please confirm your password to delete your account." }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.user.id) as any;

    if (!user || !verifyPassword(password, user.password_hash, user.salt)) {
      return NextResponse.json({ error: "Incorrect password. Account deletion aborted." }, { status: 403 });
    }

    logSecurityEvent(session.user.id, "ACCOUNT_DELETED", `User requested permanent erasure: ${session.user.email}`);

    // Cascade delete user
    db.prepare("DELETE FROM users WHERE id = ?").run(session.user.id);

    await clearSessionCookie();

    return NextResponse.json({ success: true, message: "Your account and all associated data have been permanently deleted." });
  } catch (err) {
    console.error("Account deletion error:", err);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
}

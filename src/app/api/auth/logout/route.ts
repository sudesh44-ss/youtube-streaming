import { NextResponse } from "next/server";
import { clearSessionCookie, getCurrentSession, logSecurityEvent } from "@/lib/auth";

export async function POST() {
  try {
    const session = await getCurrentSession();
    if (session) {
      logSecurityEvent(session.user.id, "LOGOUT", "User logged out");
    }
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getOAuthConnectionAsync } from "@/lib/data-service";
import { getGoogleAccountDetails } from "@/lib/google-account";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json({ connected: false });
    }

    const conn = await getOAuthConnectionAsync(session.user.id, "youtube");
    if (!conn) {
      return NextResponse.json({ connected: false });
    }

    let email: string | null = null;
    let emailVerified = false;

    if (conn.accessToken) {
      const details = await getGoogleAccountDetails(session.user.id, conn.accessToken);
      if (details) {
        email = details.email;
        emailVerified = details.emailVerified;
      }
    }

    return NextResponse.json({
      connected: true,
      channelTitle: conn.channelTitle || "Connected YouTube Channel",
      connectedAt: conn.connectedAt,
      email,
      emailVerified,
    });
  } catch (err) {
    console.error("YouTube connection status check error:", err);
    return NextResponse.json({ connected: false });
  }
}

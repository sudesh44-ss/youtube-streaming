import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getOAuthConnectionAsync } from "@/lib/data-service";

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

    return NextResponse.json({
      connected: true,
      channelTitle: conn.channelTitle || "Connected YouTube Channel",
      connectedAt: conn.connectedAt,
    });
  } catch (err) {
    console.error("YouTube connection status check error:", err);
    return NextResponse.json({ connected: false });
  }
}

import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json({ connected: false });
    }

    const db = getDb();
    const row = db
      .prepare("SELECT channel_title, updated_at FROM oauth_connections WHERE user_id = ? AND provider = 'youtube'")
      .get(session.user.id) as { channel_title?: string; updated_at?: number } | undefined;

    if (!row) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      channelTitle: row.channel_title || "Connected YouTube Channel",
      connectedAt: row.updated_at,
    });
  } catch (err) {
    console.error("YouTube connection status check error:", err);
    return NextResponse.json({ connected: false });
  }
}

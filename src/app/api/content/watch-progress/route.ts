import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkRateLimit, getClientIp, rateLimitExceededResponse, RATE_LIMIT_POLICIES } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ success: true, history: [] });
    }

    const db = getDb();
    const rows = db.prepare(`
      SELECT content_id, provider, title, channel_name, thumbnail_url,
             duration_seconds, progress_seconds, progress_percent, completed, updated_at
      FROM watch_history
      WHERE user_id = ? AND progress_percent > 0 AND completed = 0
      ORDER BY updated_at DESC
      LIMIT 10
    `).all(session.user.id) as any[];

    return NextResponse.json({ success: true, history: rows });
  } catch (err) {
    console.error("Watch progress GET error:", err);
    return NextResponse.json({ error: "Failed to load watch progress." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit(`${session.user.id}:${ip}`, RATE_LIMIT_POLICIES.SEARCH);
    if (!rateCheck.success) {
      return rateLimitExceededResponse(rateCheck);
    }

    const body = await req.json();
    const {
      contentId,
      provider = "youtube",
      title,
      channelName,
      thumbnailUrl,
      durationSeconds = 0,
      progressSeconds = 0,
    } = body;

    if (!contentId || !title) {
      return NextResponse.json({ error: "contentId and title are required." }, { status: 400 });
    }

    const duration = Math.max(0, Number(durationSeconds) || 0);
    const progress = Math.max(0, Number(progressSeconds) || 0);
    const percent = duration > 0 ? Math.min(100, Math.round((progress / duration) * 100)) : 0;
    const completed = percent >= 92 ? 1 : 0;
    const now = Date.now();

    const db = getDb();
    db.prepare(`
      INSERT INTO watch_history (
        id, user_id, content_id, provider, title, channel_name, thumbnail_url,
        duration_seconds, progress_seconds, progress_percent, completed, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, provider, content_id) DO UPDATE SET
        progress_seconds = excluded.progress_seconds,
        progress_percent = excluded.progress_percent,
        completed = excluded.completed,
        updated_at = excluded.updated_at
    `).run(
      crypto.randomUUID(),
      session.user.id,
      contentId,
      provider,
      title,
      channelName || "",
      thumbnailUrl || "",
      duration,
      progress,
      percent,
      completed,
      now
    );

    return NextResponse.json({ success: true, percent });
  } catch (err) {
    console.error("Watch progress POST error:", err);
    return NextResponse.json({ error: "Failed to save watch progress." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    db.prepare("DELETE FROM watch_history WHERE user_id = ?").run(session.user.id);

    return NextResponse.json({ success: true, message: "Watch history cleared." });
  } catch (err) {
    console.error("Watch progress DELETE error:", err);
    return NextResponse.json({ error: "Failed to clear watch history." }, { status: 500 });
  }
}

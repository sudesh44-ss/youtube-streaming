import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getWatchProgressForUser, saveWatchProgressForUser } from "@/lib/data-service";
import { getDb } from "@/lib/db";
import { isSupabaseServerConfigured, createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitExceededResponse, RATE_LIMIT_POLICIES } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ success: true, history: [] });
    }

    const rows = await getWatchProgressForUser(session.user.id);
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

    const result = await saveWatchProgressForUser(session.user.id, {
      contentId,
      provider,
      title,
      channelName,
      thumbnailUrl,
      durationSeconds,
      progressSeconds,
    });

    return NextResponse.json(result);
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

    if (isSupabaseServerConfigured()) {
      try {
        const client = process.env.SUPABASE_SERVICE_ROLE_KEY
          ? createAdminClient()
          : await createServerSupabaseClient();
        await client.from("watch_history").delete().eq("user_id", session.user.id);
      } catch {
        // Safe fallback
      }
    }

    try {
      const db = getDb();
      db.prepare("DELETE FROM watch_history WHERE user_id = ?").run(session.user.id);
    } catch {
      // Safe fallback
    }

    return NextResponse.json({ success: true, message: "Watch progress cleared." });
  } catch (err) {
    console.error("Watch progress DELETE error:", err);
    return NextResponse.json({ error: "Failed to clear watch progress." }, { status: 500 });
  }
}

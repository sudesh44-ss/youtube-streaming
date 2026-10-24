import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getSearchHistoryForUser, clearSearchHistoryForUser } from "@/lib/data-service";
import { ServerTimer } from "@/lib/timing";

export const dynamic = "force-dynamic";

export async function GET() {
  const timer = new ServerTimer();
  try {
    timer.start("auth");
    const session = await getCurrentSession();
    timer.end("auth");

    if (!session) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      res.headers.set("Server-Timing", timer.toHeader());
      return res;
    }

    timer.start("db_history");
    const rows = await getSearchHistoryForUser(session.user.id);
    timer.end("db_history");

    const res = NextResponse.json({ success: true, history: rows });
    res.headers.set("Server-Timing", timer.toHeader());
    return res;
  } catch (err) {
    console.error("History GET error:", err);
    return NextResponse.json({ error: "Failed to load history." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await clearSearchHistoryForUser(session.user.id);
    return NextResponse.json({ success: true, message: "Search history cleared." });
  } catch (err) {
    console.error("History DELETE error:", err);
    return NextResponse.json({ error: "Failed to clear history." }, { status: 500 });
  }
}

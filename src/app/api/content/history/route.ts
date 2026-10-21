import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";


export async function GET(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const rows = db.prepare(`
      SELECT DISTINCT query, category, mode, MAX(searched_at) as searched_at
      FROM search_history
      WHERE user_id = ?
      GROUP BY query
      ORDER BY searched_at DESC
      LIMIT 15
    `).all(session.user.id);

    return NextResponse.json({ success: true, history: rows });
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

    const db = getDb();
    db.prepare("DELETE FROM search_history WHERE user_id = ?").run(session.user.id);

    return NextResponse.json({ success: true, message: "Search history cleared." });
  } catch (err) {
    console.error("History DELETE error:", err);
    return NextResponse.json({ error: "Failed to clear history." }, { status: 500 });
  }
}

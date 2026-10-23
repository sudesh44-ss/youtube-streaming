import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getSearchHistoryForUser, clearSearchHistoryForUser } from "@/lib/data-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await getSearchHistoryForUser(session.user.id);
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

    await clearSearchHistoryForUser(session.user.id);
    return NextResponse.json({ success: true, message: "Search history cleared." });
  } catch (err) {
    console.error("History DELETE error:", err);
    return NextResponse.json({ error: "Failed to clear history." }, { status: 500 });
  }
}

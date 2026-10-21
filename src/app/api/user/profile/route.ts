import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";


export async function GET(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: session.user,
      preferences: session.preferences,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch profile." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, displayName } = await req.json();
    const updatedName = (name || displayName || "").trim();

    if (updatedName.length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 });
    }

    const db = getDb();
    const now = Date.now();

    db.prepare("UPDATE users SET name = ?, updated_at = ? WHERE id = ?").run(updatedName, now, session.user.id);
    db.prepare("UPDATE user_preferences SET display_name = ?, updated_at = ? WHERE user_id = ?").run(
      updatedName,
      now,
      session.user.id
    );

    return NextResponse.json({ success: true, name: updatedName });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}

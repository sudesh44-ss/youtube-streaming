import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { updateUserProfile } from "@/lib/data-service";

export const dynamic = "force-dynamic";

export async function GET() {
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
  } catch {
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

    await updateUserProfile(session.user.id, updatedName);

    // Also update Supabase auth metadata if admin client is configured
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      if (admin) {
        await admin.auth.admin.updateUserById(session.user.id, {
          user_metadata: { name: updatedName, full_name: updatedName },
        });
      }
    } catch {
      // Non-blocking fallback
    }

    return NextResponse.json({ success: true, name: updatedName });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}

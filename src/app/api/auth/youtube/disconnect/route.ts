import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { deleteOAuthConnectionAsync } from "@/lib/data-service";
import { invalidateGoogleAccountCache } from "@/lib/google-account";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await deleteOAuthConnectionAsync(session.user.id, "youtube");
    invalidateGoogleAccountCache(session.user.id);

    return NextResponse.json({
      success: true,
      message: "YouTube account disconnected successfully.",
    });
  } catch (err: any) {
    console.error("YouTube account disconnect error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to disconnect YouTube account." },
      { status: 500 }
    );
  }
}

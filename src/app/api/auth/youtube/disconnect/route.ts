import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { deleteOAuthConnectionAsync, getOAuthConnectionAsync } from "@/lib/data-service";
import { invalidateGoogleAccountCache, revokeGoogleOAuthToken } from "@/lib/google-account";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Retrieve existing connection to attempt external Google revocation
    let revoked = false;
    try {
      const conn = await getOAuthConnectionAsync(session.user.id, "youtube");
      if (conn?.accessToken) {
        revoked = await revokeGoogleOAuthToken(conn.accessToken);
      }
    } catch (e) {
      console.warn("External Google token revocation attempt note:", e);
    }

    // 2. Permanently delete all local and Supabase connection records
    await deleteOAuthConnectionAsync(session.user.id, "youtube");
    invalidateGoogleAccountCache(session.user.id);

    return NextResponse.json({
      success: true,
      message: "YouTube account disconnected successfully.",
      externalRevocation: revoked ? "revoked_at_google" : "skipped_or_unreachable",
    });
  } catch (err: any) {
    console.error("YouTube account disconnect error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to disconnect YouTube account." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { resetUserRecommendationProfileAsync } from "@/lib/data-service";
import { appCache } from "@/lib/cache-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required to reset recommendation profile." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Reset persistent learned profile
    await resetUserRecommendationProfileAsync(userId);

    // Invalidate user-isolated recommendation cache entries
    appCache.invalidatePrefix(`rec:${userId}:`);
    appCache.invalidatePrefix(userId);

    return NextResponse.json({
      success: true,
      message: "Recommendation profile has been successfully reset to defaults.",
    });
  } catch (err: any) {
    console.error("Recommendations reset error:", err);
    return NextResponse.json(
      { error: "Internal server error resetting recommendation profile." },
      { status: 500 }
    );
  }
}

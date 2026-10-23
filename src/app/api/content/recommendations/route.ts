import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getRecommendedContent } from "@/lib/recommendations";
import { BrowsingMode } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category") || undefined;
    const subcategory = searchParams.get("subcategory") || undefined;
    const mode = (searchParams.get("mode") as BrowsingMode) || (category ? "category" : "normal");
    const videoType = (searchParams.get("videoType") as "all" | "shorts" | "videos") || "all";
    const limit = parseInt(searchParams.get("limit") || "16", 10);

    const items = await getRecommendedContent({
      userId: session?.user.id,
      category,
      subcategory,
      mode,
      videoType,
      limit,
    });

    return NextResponse.json({
      success: true,
      mode,
      category,
      videoType,
      count: items.length,
      items,
    });
  } catch (err) {
    console.error("Recommendations API error:", err);
    return NextResponse.json({ error: "Failed to generate recommendations." }, { status: 500 });
  }
}

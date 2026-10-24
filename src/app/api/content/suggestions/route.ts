import { NextRequest, NextResponse } from "next/server";
import { appCache } from "@/lib/cache-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";

    if (!query || query.length < 1) {
      return NextResponse.json({ success: true, query: "", suggestions: [] });
    }

    const cacheKey = `suggestions:${query.toLowerCase()}`;
    const cached = appCache.get<string[]>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, query, suggestions: cached, fromCache: true });
    }

    // Query YouTube/Google public completion endpoint (policy-compliant search suggestion API)
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3000),
      headers: {
        "Accept": "application/json",
        "User-Agent": "OmniDiscover/1.0",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ success: true, query, suggestions: [] });
    }

    const data = await res.json();
    let suggestions: string[] = [];

    // Format is [query, [sugg1, sugg2, ...]]
    if (Array.isArray(data) && Array.isArray(data[1])) {
      suggestions = data[1]
        .filter((s: any): s is string => typeof s === "string" && s.trim().length > 0)
        .slice(0, 10);
    }

    // Cache in server memory for 1 hour to reduce upstream calls
    appCache.set(cacheKey, suggestions, 3600);

    return NextResponse.json({ success: true, query, suggestions });
  } catch {
    // Graceful error fallback: never break the client search experience
    return NextResponse.json({ success: true, suggestions: [] });
  }
}

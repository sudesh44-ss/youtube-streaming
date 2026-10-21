import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentSession } from "@/lib/auth";
import { queryUnifiedContent } from "@/lib/providers";
import { getDb } from "@/lib/db";
import { BrowsingMode } from "@/lib/types";


export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const { searchParams } = new URL(req.url);

    const query = searchParams.get("q") || "";
    const category = searchParams.get("category") || undefined;
    const subcategory = searchParams.get("subcategory") || undefined;
    const mode = (searchParams.get("mode") as BrowsingMode) || "normal";
    const sortBy = (searchParams.get("sortBy") as any) || "relevance";
    const limit = parseInt(searchParams.get("limit") || "24", 10);

    // Save search history if query is provided and user is authenticated
    if (session && query.trim().length > 1) {
      try {
        const db = getDb();
        const historyId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO search_history (id, user_id, query, category, mode, searched_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(historyId, session.user.id, query.trim(), category || null, mode, Date.now());
      } catch (e) {
        console.warn("Failed to record search history:", e);
      }
    }

    const items = await queryUnifiedContent(
      {
        query,
        category,
        subcategory,
        mode,
        sortBy,
        limit,
      },
      session?.user.id
    );

    return NextResponse.json({
      success: true,
      query,
      category,
      mode,
      count: items.length,
      items,
    });
  } catch (err) {
    console.error("Search API error:", err);
    return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}

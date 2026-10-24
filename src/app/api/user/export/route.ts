import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isSupabaseServerConfigured, createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function isUuid(id?: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    let user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      createdAt: session.user.createdAt,
    };
    let preferences: any = session.preferences || null;
    let savedContent: any[] = [];
    let searchHistory: any[] = [];
    let providers: any[] = [];
    let legalAcceptance: any[] = [];

    // 1. Supabase check
    if (isSupabaseServerConfigured() && isUuid(userId)) {
      try {
        const client = process.env.SUPABASE_SERVICE_ROLE_KEY
          ? createAdminClient()
          : await createServerSupabaseClient();

        const [prefRes, savedRes, searchRes, provRes] = await Promise.all([
          client.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
          client.from("saved_content").select("provider, content_id, content_type, title, category, saved_at").eq("user_id", userId),
          client.from("search_history").select("query, category, mode, searched_at").eq("user_id", userId),
          client.from("provider_credentials").select("provider_id, status, masked_key, last_validated_at").eq("user_id", userId),
        ]);

        if (prefRes.data) preferences = prefRes.data;
        if (savedRes.data) savedContent = savedRes.data;
        if (searchRes.data) searchHistory = searchRes.data;
        if (provRes.data) providers = provRes.data;
      } catch (e) {
        console.warn("Export data Supabase warning:", e);
      }
    }

    // 2. SQLite fallback for local / dev
    if (savedContent.length === 0 && searchHistory.length === 0) {
      try {
        const db = getDb();
        const u = db.prepare("SELECT id, email, name, email_verified, created_at FROM users WHERE id = ?").get(userId);
        if (u) user = u as any;
        const p = db.prepare("SELECT * FROM user_preferences WHERE user_id = ?").get(userId);
        if (p) preferences = p;
        legalAcceptance = db.prepare("SELECT terms_version, privacy_version, accepted_at FROM legal_acceptance WHERE user_id = ?").all(userId);
        savedContent = db.prepare("SELECT provider, content_id, content_type, title, category, saved_at FROM saved_content WHERE user_id = ?").all(userId);
        searchHistory = db.prepare("SELECT query, category, mode, searched_at FROM search_history WHERE user_id = ?").all(userId);
        providers = db.prepare("SELECT provider_id, status, masked_key, last_validated_at FROM provider_credentials WHERE user_id = ?").all(userId);
      } catch {
        // Safe fallback
      }
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      account: user,
      preferences,
      legalConsentRecords: legalAcceptance,
      savedContent,
      searchHistory,
      connectedProviders: providers,
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="data-export-${session.user.id}.json"`,
      },
    });
  } catch (err) {
    console.error("Data export error:", err);
    return NextResponse.json({ error: "Failed to export data." }, { status: 500 });
  }
}

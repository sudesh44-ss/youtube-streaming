import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";


export async function GET(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const userId = session.user.id;

    const user = db.prepare("SELECT id, email, name, email_verified, created_at FROM users WHERE id = ?").get(userId);
    const preferences = db.prepare("SELECT * FROM user_preferences WHERE user_id = ?").get(userId);
    const legalAcceptance = db.prepare("SELECT terms_version, privacy_version, accepted_at FROM legal_acceptance WHERE user_id = ?").all(userId);
    const savedContent = db.prepare("SELECT provider, content_id, content_type, title, category, saved_at FROM saved_content WHERE user_id = ?").all(userId);
    const searchHistory = db.prepare("SELECT query, category, mode, searched_at FROM search_history WHERE user_id = ?").all(userId);
    const providers = db.prepare("SELECT provider_id, status, masked_key, last_validated_at FROM provider_credentials WHERE user_id = ?").all(userId);

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

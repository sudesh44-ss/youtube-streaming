import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";


export async function GET(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM saved_content
      WHERE user_id = ?
      ORDER BY saved_at DESC
    `).all(session.user.id) as any[];

    const items = rows.map((r) => {
      let meta = {};
      try {
        if (r.metadata) meta = JSON.parse(r.metadata);
      } catch {}

      return {
        id: `${r.provider}:${r.content_id}`,
        provider: r.provider,
        providerId: r.content_id,
        contentType: r.content_type,
        title: r.title,
        description: r.description,
        thumbnail: r.thumbnail_url,
        category: r.category,
        externalUrl: r.external_url,
        savedAt: r.saved_at,
        saved: true,
        ...meta,
      };
    });

    return NextResponse.json({ success: true, items });
  } catch (err) {
    console.error("Saved content GET error:", err);
    return NextResponse.json({ error: "Failed to load saved items." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { provider, contentId, contentType, title, description, thumbnail, category, externalUrl, metadata } = body;

    if (!provider || !contentId || !title) {
      return NextResponse.json({ error: "Missing required content parameters." }, { status: 400 });
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const now = Date.now();

    db.prepare(`
      INSERT OR REPLACE INTO saved_content (
        id, user_id, provider, content_id, content_type, title, description, thumbnail_url, category, external_url, metadata, saved_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      session.user.id,
      provider,
      contentId,
      contentType || "video",
      title,
      description || "",
      thumbnail || "",
      category || "general",
      externalUrl || "",
      metadata ? JSON.stringify(metadata) : null,
      now
    );

    return NextResponse.json({ success: true, saved: true });
  } catch (err) {
    console.error("Saved content POST error:", err);
    return NextResponse.json({ error: "Failed to save item." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider");
    const contentId = searchParams.get("contentId");

    if (!provider || !contentId) {
      return NextResponse.json({ error: "Provider and contentId required." }, { status: 400 });
    }

    const db = getDb();
    db.prepare(`
      DELETE FROM saved_content
      WHERE user_id = ? AND provider = ? AND content_id = ?
    `).run(session.user.id, provider, contentId);

    return NextResponse.json({ success: true, saved: false });
  } catch (err) {
    console.error("Saved content DELETE error:", err);
    return NextResponse.json({ error: "Failed to remove item." }, { status: 500 });
  }
}

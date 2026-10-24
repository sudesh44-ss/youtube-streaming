import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getSavedContentForUser, saveContentForUser, deleteSavedContentForUser } from "@/lib/data-service";
import { ServerTimer } from "@/lib/timing";

export const dynamic = "force-dynamic";

export async function GET() {
  const timer = new ServerTimer();
  try {
    timer.start("auth");
    const session = await getCurrentSession();
    timer.end("auth");

    if (!session) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      res.headers.set("Server-Timing", timer.toHeader());
      return res;
    }

    timer.start("db_saved");
    const items = await getSavedContentForUser(session.user.id);
    timer.end("db_saved");

    const res = NextResponse.json({ success: true, items });
    res.headers.set("Server-Timing", timer.toHeader());
    return res;
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
    const { provider, contentId, title } = body;

    if (!provider || !contentId || !title) {
      return NextResponse.json({ error: "Missing required content parameters." }, { status: 400 });
    }

    await saveContentForUser(session.user.id, body);
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

    await deleteSavedContentForUser(session.user.id, provider, contentId);
    return NextResponse.json({ success: true, saved: false });
  } catch (err) {
    console.error("Saved content DELETE error:", err);
    return NextResponse.json({ error: "Failed to remove item." }, { status: 500 });
  }
}

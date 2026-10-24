import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getProviderStatusListAsync, DEFAULT_PROVIDERS } from "@/lib/data-service";
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

    timer.start("db_status");
    const providers = await getProviderStatusListAsync(session.user.id);
    timer.end("db_status");

    const res = NextResponse.json({ success: true, providers });
    res.headers.set("Server-Timing", timer.toHeader());
    return res;
  } catch (err) {
    console.error("Provider status error:", err);
    const res = NextResponse.json({ success: true, providers: DEFAULT_PROVIDERS });
    res.headers.set("Server-Timing", timer.toHeader());
    return res;
  }
}

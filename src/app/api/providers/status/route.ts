import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getProviderStatusListAsync, DEFAULT_PROVIDERS } from "@/lib/data-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const providers = await getProviderStatusListAsync(session.user.id);
    return NextResponse.json({ success: true, providers });
  } catch (err) {
    console.error("Provider status error:", err);
    // Safe resilience: Return default catalog with disconnected status rather than crashing Settings UI
    return NextResponse.json({ success: true, providers: DEFAULT_PROVIDERS });
  }
}

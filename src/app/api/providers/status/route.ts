import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getProviderStatusList } from "@/lib/providers";


export async function GET(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const providers = getProviderStatusList(session.user.id);
    return NextResponse.json({ success: true, providers });
  } catch (err) {
    console.error("Provider status error:", err);
    return NextResponse.json({ error: "Failed to fetch provider status." }, { status: 500 });
  }
}

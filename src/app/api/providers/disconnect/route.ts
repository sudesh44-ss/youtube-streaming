import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { disconnectProviderCredential } from "@/lib/data-service";
import { checkRateLimit, getClientIp, rateLimitExceededResponse, RATE_LIMIT_POLICIES } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit(`${session.user.id}:${ip}`, RATE_LIMIT_POLICIES.PROVIDER_MUTATION);
    if (!rateCheck.success) {
      return rateLimitExceededResponse(rateCheck);
    }

    const { providerId } = await req.json();
    if (!providerId) {
      return NextResponse.json({ error: "providerId is required." }, { status: 400 });
    }

    const result = await disconnectProviderCredential(session.user.id, providerId);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Disconnect provider error:", err);
    return NextResponse.json({ error: err?.message || "Failed to disconnect provider." }, { status: 500 });
  }
}

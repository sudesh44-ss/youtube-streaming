import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getAdapter, getUserProviderKey } from "@/lib/providers";
import { checkRateLimit, getClientIp, rateLimitExceededResponse, RATE_LIMIT_POLICIES } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit(`${session.user.id}:${ip}`, RATE_LIMIT_POLICIES.PROVIDER_TEST);
    if (!rateCheck.success) {
      return rateLimitExceededResponse(rateCheck);
    }

    const { providerId, apiKey } = await req.json();

    if (!providerId) {
      return NextResponse.json({ error: "providerId is required." }, { status: 400 });
    }

    const adapter = getAdapter(providerId);
    if (!adapter) {
      return NextResponse.json({ error: "Unsupported provider." }, { status: 404 });
    }

    // Use passed raw key, or fetch saved decrypted key
    let keyToTest = apiKey;
    if (!keyToTest) {
      keyToTest = getUserProviderKey(session.user.id, providerId);
    }

    if (!keyToTest) {
      return NextResponse.json({ error: "No API key provided or found on record." }, { status: 400 });
    }

    const result = await adapter.validateCredentials(keyToTest);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error("Provider test error:", err);
    return NextResponse.json({ error: "Provider test execution failed." }, { status: 500 });
  }
}

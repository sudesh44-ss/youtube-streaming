import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getAdapter } from "@/lib/providers";
import { saveProviderCredential } from "@/lib/data-service";
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

    const { providerId, apiKey } = await req.json();

    if (!providerId || !apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "providerId and a valid apiKey string are required." }, { status: 400 });
    }

    const adapter = getAdapter(providerId);
    if (!adapter) {
      return NextResponse.json({ error: "Unsupported provider." }, { status: 404 });
    }

    // Step 1: Validate with provider
    const validation = await adapter.validateCredentials(apiKey.trim());
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: validation.errorMessage || "Failed to validate credentials with provider.",
          status: validation.status,
        },
        { status: 400 }
      );
    }

    // Step 2: Encrypt secret with AES-256-GCM and store securely
    const result = await saveProviderCredential(session.user.id, providerId, apiKey.trim());

    return NextResponse.json({
      success: true,
      providerId: result.providerId,
      status: result.status,
      maskedKey: result.maskedKey,
      lastValidatedAt: result.lastValidatedAt,
    });
  } catch (err: any) {
    console.error("Connect provider error:", err);
    return NextResponse.json({ error: err?.message || "Failed to connect provider." }, { status: 500 });
  }
}

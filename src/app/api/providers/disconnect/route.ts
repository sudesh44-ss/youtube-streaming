import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
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

    const db = getDb();
    db.prepare("DELETE FROM provider_credentials WHERE user_id = ? AND provider_id = ?").run(
      session.user.id,
      providerId
    );

    return NextResponse.json({
      success: true,
      providerId,
      status: "disconnected",
    });
  } catch (err) {
    console.error("Disconnect provider error:", err);
    return NextResponse.json({ error: "Failed to disconnect provider." }, { status: 500 });
  }
}

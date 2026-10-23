import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentSession } from "@/lib/auth";
import { getAdapter } from "@/lib/providers";
import { encryptSecret, maskApiKey } from "@/lib/crypto";
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

    // Step 2: Encrypt secret with AES-256-GCM
    const encrypted = encryptSecret(apiKey.trim());
    const masked = maskApiKey(apiKey.trim());
    const db = getDb();
    const id = crypto.randomUUID();
    const now = Date.now();

    db.prepare(`
      INSERT INTO provider_credentials (
        id, user_id, provider_id, encrypted_secret, iv, auth_tag, key_version, status, masked_key, last_validated_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'connected', ?, ?, ?, ?)
      ON CONFLICT(user_id, provider_id) DO UPDATE SET
        encrypted_secret = excluded.encrypted_secret,
        iv = excluded.iv,
        auth_tag = excluded.auth_tag,
        key_version = excluded.key_version,
        status = 'connected',
        masked_key = excluded.masked_key,
        last_validated_at = excluded.last_validated_at,
        last_error = NULL,
        updated_at = excluded.updated_at
    `).run(
      id,
      session.user.id,
      providerId,
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.authTag,
      encrypted.keyVersion,
      masked,
      now,
      now,
      now
    );

    return NextResponse.json({
      success: true,
      providerId,
      status: "connected",
      maskedKey: masked,
      lastValidatedAt: now,
    });
  } catch (err) {
    console.error("Connect provider error:", err);
    return NextResponse.json({ error: "Failed to connect provider." }, { status: 500 });
  }
}

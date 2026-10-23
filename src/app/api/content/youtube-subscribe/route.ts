import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required to manage YouTube subscriptions." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { channelId, action = "subscribe", subscriptionId } = body;

    if (!channelId || typeof channelId !== "string") {
      return NextResponse.json({ error: "channelId is required." }, { status: 400 });
    }

    if (action !== "subscribe" && action !== "unsubscribe") {
      return NextResponse.json({ error: "Invalid action. Must be 'subscribe' or 'unsubscribe'." }, { status: 400 });
    }

    const db = getDb();
    const row = db
      .prepare(
        "SELECT encrypted_access_token, iv, auth_tag FROM oauth_connections WHERE user_id = ? AND provider = 'youtube'"
      )
      .get(session.user.id) as { encrypted_access_token: string; iv: string; auth_tag: string } | undefined;

    if (!row) {
      return NextResponse.json(
        {
          error: "YouTube account not connected. Please connect your YouTube account in Settings to manage subscriptions.",
          requiresConnect: true,
        },
        { status: 400 }
      );
    }

    let accessToken: string;
    try {
      accessToken = decryptSecret(row.encrypted_access_token, row.iv, row.auth_tag);
    } catch {
      return NextResponse.json(
        { error: "Failed to decrypt YouTube authorization. Please reconnect your account." },
        { status: 400 }
      );
    }

    if (action === "subscribe") {
      const url = "https://www.googleapis.com/youtube/v3/subscriptions?part=snippet";
      const ytRes = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snippet: {
            resourceId: {
              kind: "youtube#channel",
              channelId,
            },
          },
        }),
      });

      const data = await ytRes.json().catch(() => ({}));
      if (ytRes.ok || ytRes.status === 200 || ytRes.status === 201) {
        return NextResponse.json({
          success: true,
          status: "subscribed",
          subscriptionId: data.id,
          message: "Subscribed to channel on YouTube!",
        });
      }

      // If already subscribed
      if (data?.error?.errors?.[0]?.reason === "subscriptionDuplicate") {
        return NextResponse.json({
          success: true,
          status: "subscribed",
          message: "Already subscribed to this channel on YouTube.",
        });
      }

      return NextResponse.json(
        { error: data?.error?.message || "YouTube API rejected subscription request." },
        { status: ytRes.status || 400 }
      );
    } else {
      // Unsubscribe action
      let targetSubId = subscriptionId;
      if (!targetSubId) {
        // Look up subscription ID first
        const lookupUrl = `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&forChannelId=${encodeURIComponent(channelId)}`;
        const lookupRes = await fetch(lookupUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (lookupRes.ok) {
          const lookupData = await lookupRes.json();
          if (Array.isArray(lookupData.items) && lookupData.items.length > 0) {
            targetSubId = lookupData.items[0].id;
          }
        }
      }

      if (targetSubId) {
        const delUrl = `https://www.googleapis.com/youtube/v3/subscriptions?id=${encodeURIComponent(targetSubId)}`;
        const delRes = await fetch(delUrl, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (delRes.status === 204 || delRes.ok) {
          return NextResponse.json({
            success: true,
            status: "not_subscribed",
            message: "Unsubscribed from channel on YouTube.",
          });
        }
      }

      return NextResponse.json({
        success: true,
        status: "not_subscribed",
        message: "No active subscription found on YouTube.",
      });
    }
  } catch (err) {
    console.error("YouTube subscribe API error:", err);
    return NextResponse.json({ error: "Failed to update subscription status." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getOAuthConnectionAsync } from "@/lib/data-service";

export const dynamic = "force-dynamic";

const REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.force-ssl",
];

function validChannelId(channelId: unknown): channelId is string {
  return typeof channelId === "string" && /^UC[A-Za-z0-9_-]{22}$/.test(channelId);
}

function apiError(data: any, fallback: string) {
  const reason = data?.error?.errors?.[0]?.reason;
  const message = data?.error?.message;
  if (reason === "quotaExceeded") return "YouTube API quota is exhausted. Try again after the quota resets.";
  if (reason === "invalidCredentials" || reason === "authError") return "Your YouTube connection expired. Reconnect your account in Settings.";
  return message || fallback;
}

function requiresReauth(data: any): boolean {
  const reason = data?.error?.errors?.[0]?.reason;
  return reason === "authError" || reason === "invalidCredentials" || reason === "insufficientPermissions";
}

async function getConnection(userId: string) {
  const conn = await getOAuthConnectionAsync(userId, "youtube");
  if (!conn?.accessToken) {
    return { response: NextResponse.json({ error: "Connect a YouTube account in Settings to manage subscriptions.", requiresConnect: true }, { status: 401 }) };
  }
  const scopes = new Set((conn.scope || "").split(/\s+/).filter(Boolean));
  if (!REQUIRED_SCOPES.some((scope) => scopes.has(scope))) {
    return { response: NextResponse.json({ error: "Reconnect YouTube and approve channel subscription access.", requiresReauth: true }, { status: 403 }) };
  }
  return { accessToken: conn.accessToken };
}

async function listSubscription(accessToken: string, channelId: string) {
  const url = new URL("https://www.googleapis.com/youtube/v3/subscriptions");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("mine", "true");
  url.searchParams.set("forChannelId", channelId);
  url.searchParams.set("maxResults", "1");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(8000),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data, item: Array.isArray(data.items) ? data.items[0] : undefined };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) return NextResponse.json({ error: "Sign in to check YouTube subscription status.", requiresConnect: true }, { status: 401 });

    const channelId = new URL(req.url).searchParams.get("channelId");
    if (!validChannelId(channelId)) return NextResponse.json({ error: "A valid YouTube channel ID is required." }, { status: 400 });

    const connection = await getConnection(session.user.id);
    if (connection.response) return connection.response;
    const result = await listSubscription(connection.accessToken!, channelId);
    if (!result.response.ok) {
      return NextResponse.json({ error: apiError(result.data, "Could not verify YouTube subscription status.") }, { status: result.response.status });
    }
    return NextResponse.json({
      success: true,
      isSubscribed: Boolean(result.item),
      subscriptionId: result.item?.id,
    });
  } catch {
    return NextResponse.json({ error: "Could not verify YouTube subscription status." }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) return NextResponse.json({ error: "Sign in to manage YouTube subscriptions.", requiresConnect: true }, { status: 401 });

    const body = await req.json();
    const { channelId, action = "subscribe" } = body;
    if (!validChannelId(channelId)) return NextResponse.json({ error: "A valid YouTube channel ID is required." }, { status: 400 });
    if (action !== "subscribe" && action !== "unsubscribe") return NextResponse.json({ error: "Invalid subscription action." }, { status: 400 });

    const connection = await getConnection(session.user.id);
    if (connection.response) return connection.response;
    const accessToken = connection.accessToken!;

    // Check first to avoid duplicate writes and to obtain the subscription ID for delete.
    const existing = await listSubscription(accessToken, channelId);
    if (!existing.response.ok) {
      return NextResponse.json({ error: apiError(existing.data, "Could not check the current subscription."), requiresReauth: existing.response.status === 401 || requiresReauth(existing.data) }, { status: existing.response.status });
    }

    if (action === "subscribe") {
      if (existing.item) return NextResponse.json({ success: true, status: "subscribed", verified: true, subscriptionId: existing.item.id });

      const insert = await fetch("https://www.googleapis.com/youtube/v3/subscriptions?part=snippet", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ snippet: { resourceId: { kind: "youtube#channel", channelId } } }),
        signal: AbortSignal.timeout(10000),
      });
      const inserted = await insert.json().catch(() => ({}));
      if (!insert.ok && inserted?.error?.errors?.[0]?.reason !== "subscriptionDuplicate") {
        return NextResponse.json({ error: apiError(inserted, "YouTube rejected the subscription request."), requiresReauth: insert.status === 401 || requiresReauth(inserted) }, { status: insert.status || 502 });
      }

      const verified = await listSubscription(accessToken, channelId);
      if (verified.response.ok && verified.item) {
        return NextResponse.json({ success: true, status: "subscribed", verified: true, subscriptionId: verified.item.id });
      }
      return NextResponse.json({ error: "YouTube accepted the request, but its subscription status could not be verified. Refresh the status before trying again.", status: "unknown" }, { status: 502 });
    }

    if (!existing.item) return NextResponse.json({ success: true, status: "not_subscribed", verified: true });
    const remove = await fetch(`https://www.googleapis.com/youtube/v3/subscriptions?id=${encodeURIComponent(existing.item.id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!remove.ok && remove.status !== 204) {
      const data = await remove.json().catch(() => ({}));
      return NextResponse.json({ error: apiError(data, "YouTube rejected the unsubscribe request."), requiresReauth: remove.status === 401 || requiresReauth(data) }, { status: remove.status || 502 });
    }
    const verified = await listSubscription(accessToken, channelId);
    if (!verified.response.ok || verified.item) {
      return NextResponse.json({ error: "The unsubscribe request completed, but the updated status could not be verified.", status: "unknown" }, { status: 502 });
    }
    return NextResponse.json({ success: true, status: "not_subscribed", verified: true });
  } catch {
    return NextResponse.json({ error: "Could not update the YouTube subscription. Check your connection and try again." }, { status: 502 });
  }
}

"use client";

import { useState } from "react";
import { YouTubeChannelItem } from "@/lib/types";
import { Users, ExternalLink, Check, BellRing, RefreshCw } from "lucide-react";

interface ChannelCardProps {
  channel: YouTubeChannelItem;
  onSubscriptionChange?: (
    channelId: string,
    newStatus: "subscribed" | "not_subscribed" | "unknown",
    subscriptionId?: string
  ) => void;
}

export function ChannelCard({ channel, onSubscriptionChange }: ChannelCardProps) {
  const [status, setStatus] = useState<"subscribed" | "not_subscribed" | "unknown">(
    channel.subscriptionStatus || "unknown"
  );
  const [subscriptionId, setSubscriptionId] = useState<string | undefined>(channel.subscriptionId);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initial = (channel.title.charAt(0) || "Y").toUpperCase();

  const handleToggleSubscribe = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMsg(null);

    const nextAction = status === "subscribed" ? "unsubscribe" : "subscribe";

    try {
      const res = await fetch("/api/content/youtube-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channel.id,
          action: nextAction,
          subscriptionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Subscription update failed.");
      } else {
        const nextStatus = data.status as "subscribed" | "not_subscribed";
        setStatus(nextStatus);
        setSubscriptionId(data.subscriptionId);
        if (onSubscriptionChange) {
          onSubscriptionChange(channel.id, nextStatus, data.subscriptionId);
        }
      }
    } catch {
      setErrorMsg("Network error communicating with YouTube service.");
    } finally {
      setLoading(false);
    }
  };

  const hasSubscriptionAction = status === "subscribed" || status === "not_subscribed";

  return (
    <div
      className="card channel-profile-card"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "1.25rem",
        borderRadius: "var(--radius-lg)",
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-color)",
        boxShadow: "var(--shadow-sm)",
        transition: "var(--transition)",
        gap: "1rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
        {/* Channel Avatar */}
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
            backgroundColor: "var(--bg-surface-elevated)",
            border: "2px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {channel.avatar ? (
            <img
              src={channel.avatar}
              alt={channel.title}
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.parentElement?.querySelector(".avatar-fallback") as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className="avatar-fallback"
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #38bdf8, #2563eb)",
              color: "#fff",
              display: channel.avatar ? "none" : "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              fontWeight: 700,
            }}
          >
            {initial}
          </div>
        </div>

        {/* Channel Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <h3
              title={channel.title}
              style={{
                fontSize: "1.0625rem",
                fontWeight: 700,
                color: "var(--text-main)",
                margin: 0,
                lineHeight: 1.3,
                wordBreak: "break-word",
              }}
            >
              {channel.title}
            </h3>

            {channel.customUrl && (
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--primary)",
                  backgroundColor: "rgba(56, 189, 248, 0.12)",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "var(--radius-full)",
                }}
              >
                {channel.customUrl}
              </span>
            )}
          </div>

          {/* Stats Row - Subscriber count only */}
          {channel.subscriberCount && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.875rem",
                margin: "0.35rem 0",
                fontSize: "0.75rem",
                color: "var(--text-dim)",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <Users size={13} style={{ color: "var(--primary)" }} />
                <span>{channel.subscriberCount}</span>
              </span>
            </div>
          )}

          {/* Description */}
          {channel.description && (
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-muted)",
                margin: 0,
                lineHeight: 1.4,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "break-word",
              }}
            >
              {channel.description}
            </p>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--accent-rose)",
            backgroundColor: "rgba(244, 63, 94, 0.1)",
            padding: "0.35rem 0.625rem",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Actions Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: hasSubscriptionAction ? "space-between" : "flex-end",
          borderTop: "1px solid var(--border-color)",
          paddingTop: "0.875rem",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        {hasSubscriptionAction && (
          <div>
            {status === "subscribed" ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--accent-emerald, #10b981)",
                    backgroundColor: "rgba(16, 185, 129, 0.12)",
                    padding: "0.25rem 0.6rem",
                    borderRadius: "var(--radius-full)",
                  }}
                >
                  <Check size={13} />
                  <span>Subscribed</span>
                </span>
                <button
                  type="button"
                  onClick={handleToggleSubscribe}
                  disabled={loading}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                  title="Unsubscribe on YouTube"
                >
                  {loading ? <RefreshCw size={12} className="spin" /> : "Unsubscribe"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleToggleSubscribe}
                disabled={loading}
                className="btn btn-primary btn-sm"
                style={{ fontSize: "0.8125rem", padding: "0.35rem 0.85rem", gap: "0.35rem" }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={13} className="spin" />
                    <span>Updating</span>
                  </>
                ) : (
                  <>
                    <BellRing size={13} />
                    <span>Subscribe</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* External Channel Link */}
        <a
          href={channel.channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline btn-sm"
          style={{ fontSize: "0.75rem", gap: "0.35rem", padding: "0.35rem 0.75rem" }}
          aria-label={`Open ${channel.title} channel on YouTube`}
        >
          <span>Channel</span>
          <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
}

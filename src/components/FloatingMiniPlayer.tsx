"use client";

import { usePathname, useRouter } from "next/navigation";
import { Play, Pause, Maximize2, X } from "lucide-react";
import { useMiniPlayer } from "@/lib/MiniPlayerContext";
import { useRef } from "react";

export function FloatingMiniPlayer() {
  const { state, closeMiniPlayer, togglePlay } = useMiniPlayer();
  const pathname = usePathname();
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // If miniplayer is not active or user is currently on the watch page for this exact video, do not show floating player
  if (!state || !state.isOpen) return null;
  if (pathname === `/watch/${state.videoId}`) return null;

  const handleExpand = () => {
    closeMiniPlayer();
    router.push(`/watch/${state.videoId}`);
  };

  const handleTogglePlay = () => {
    togglePlay();
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: state.isPlaying ? "pauseVideo" : "playVideo",
          args: [],
        }),
        "*"
      );
    }
  };

  return (
    <aside
      className="floating-miniplayer"
      role="region"
      aria-label="Floating Video Player"
    >
      {/* Top Header Bar */}
      <div className="miniplayer-header">
        <div className="miniplayer-text">
          <h4 className="miniplayer-title" title={state.title}>
            {state.title}
          </h4>
          {state.channelTitle && (
            <p className="miniplayer-channel">{state.channelTitle}</p>
          )}
        </div>

        <div className="miniplayer-actions">
          <button
            type="button"
            onClick={handleTogglePlay}
            className="miniplayer-ctrl-btn"
            title={state.isPlaying ? "Pause" : "Play"}
            aria-label={state.isPlaying ? "Pause" : "Play"}
          >
            {state.isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </button>
          <button
            type="button"
            onClick={handleExpand}
            className="miniplayer-ctrl-btn"
            title="Expand to Full Watch Page"
            aria-label="Expand to Full Watch Page"
          >
            <Maximize2 size={14} />
          </button>
          <button
            type="button"
            onClick={closeMiniPlayer}
            className="miniplayer-ctrl-btn"
            title="Close Miniplayer"
            aria-label="Close Miniplayer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Video Iframe Container */}
      <div className="miniplayer-video-box">
        <iframe
          ref={iframeRef}
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(
            state.videoId
          )}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1${
            state.currentTime > 0 ? `&start=${Math.floor(state.currentTime)}` : ""
          }`}
          title={state.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="miniplayer-iframe"
        />
      </div>

      <style jsx>{`
        .floating-miniplayer {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 340px;
          max-width: calc(100vw - 32px);
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55);
          z-index: 95;
          animation: floatIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          backdrop-filter: blur(12px);
        }

        :global([data-theme="light"]) .floating-miniplayer {
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.15);
        }

        .miniplayer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0.75rem;
          background-color: var(--bg-surface-elevated);
          border-bottom: 1px solid var(--border-color);
          gap: 0.5rem;
        }

        .miniplayer-text {
          overflow: hidden;
          flex: 1;
        }

        .miniplayer-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-main);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .miniplayer-channel {
          font-size: 0.6875rem;
          color: var(--text-muted);
          margin: 0.1rem 0 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .miniplayer-actions {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          flex-shrink: 0;
        }

        .miniplayer-ctrl-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .miniplayer-ctrl-btn:hover {
          color: var(--text-main);
          background-color: var(--bg-subtle);
        }

        .miniplayer-video-box {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          background: #000;
        }

        .miniplayer-iframe {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: none;
        }

        @keyframes floatIn {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 480px) {
          .floating-miniplayer {
            width: 280px;
            bottom: 16px;
            right: 16px;
          }
        }
      `}</style>
    </aside>
  );
}

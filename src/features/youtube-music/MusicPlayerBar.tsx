"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  X,
  SkipForward,
  SkipBack,
  Music,
} from "lucide-react";
import { MusicTrack } from "./types";

interface MusicPlayerBarProps {
  track: MusicTrack | null;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export function MusicPlayerBar({ track, onClose, onNext, onPrev }: MusicPlayerBarProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(210); // fallback ~3:30
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (track) {
      setIsPlaying(true);
      setCurrentTime(0);
    }
  }, [track?.id]);

  // Periodic timer simulation for progress slider
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= duration) {
          onNext?.();
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, duration, onNext]);

  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: nextState ? "playVideo" : "pauseVideo",
          args: [],
        }),
        "*"
      );
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [newTime, true],
        }),
        "*"
      );
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (!track) return null;

  return (
    <aside className={`music-player-bar ${isExpanded ? "expanded" : ""}`} aria-label="Music Player">
      {/* Hidden/Collapsible YouTube Player Iframe */}
      <div className="music-iframe-wrapper" style={{ display: isExpanded ? "block" : "none" }}>
        <iframe
          ref={iframeRef}
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(
            track.videoId
          )}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1`}
          title={track.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="music-iframe"
        />
      </div>

      <div className="music-bar-container">
        {/* Track Info */}
        <div className="music-track-info">
          <div className="music-album-art">
            {track.thumbnail ? (
              <img src={track.thumbnail} alt={track.title} className="album-img" />
            ) : (
              <div className="album-fallback">
                <Music size={18} />
              </div>
            )}
          </div>
          <div className="music-track-text">
            <h4 className="track-title" title={track.title}>
              {track.title}
            </h4>
            <p className="track-artist" title={track.artist}>
              {track.artist}
            </p>
          </div>
        </div>

        {/* Center Controls & Progress */}
        <div className="music-center-controls">
          <div className="music-control-buttons">
            <button
              type="button"
              onClick={onPrev}
              className="ctrl-btn-ghost"
              title="Previous Track"
              aria-label="Previous Track"
            >
              <SkipBack size={18} />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="ctrl-btn-play"
              title={isPlaying ? "Pause" : "Play"}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: "2px" }} />}
            </button>
            <button
              type="button"
              onClick={onNext}
              className="ctrl-btn-ghost"
              title="Next Track"
              aria-label="Next Track"
            >
              <SkipForward size={18} />
            </button>
          </div>

          <div className="music-progress-row">
            <span className="time-label">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              className="music-seek-slider"
              aria-label="Seek track position"
            />
            <span className="time-label">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Side Options & Actions */}
        <div className="music-right-actions">
          {/* Volume control */}
          <div className="music-volume-group">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="ctrl-btn-ghost"
              title={isMuted ? "Unmute" : "Mute"}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="volume-slider"
              aria-label="Volume level"
            />
          </div>

          {/* Toggle Video view */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`ctrl-btn-ghost ${isExpanded ? "active-accent" : ""}`}
            title={isExpanded ? "Hide Video" : "Show Video"}
            aria-label="Toggle Video display"
          >
            <Maximize2 size={16} />
          </button>

          {/* Full Watch Page Link */}
          <Link
            href={`/watch/${track.videoId}`}
            className="btn btn-outline btn-sm music-watch-link"
            title="Open in Full Video Player"
          >
            Watch Full
          </Link>

          {/* Close Player */}
          <button
            type="button"
            onClick={onClose}
            className="ctrl-btn-ghost"
            title="Close Player"
            aria-label="Close Music Player"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .music-player-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background-color: rgba(13, 17, 23, 0.94);
          backdrop-filter: blur(16px);
          border-top: 1px solid var(--border-color);
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
          z-index: 90;
          transition: all 0.25s ease;
        }

        :global([data-theme="light"]) .music-player-bar {
          background-color: rgba(255, 255, 255, 0.96);
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
        }

        .music-bar-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.625rem 1.25rem;
          max-width: 1400px;
          margin: 0 auto;
          gap: 1rem;
        }

        .music-iframe-wrapper {
          width: 100%;
          max-width: 480px;
          height: 270px;
          margin: 0.75rem auto 0;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: #000;
        }

        .music-iframe {
          width: 100%;
          height: 100%;
          border: none;
        }

        .music-track-info {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          min-width: 220px;
          max-width: 300px;
        }

        .music-album-art {
          width: 48px;
          height: 48px;
          border-radius: 6px;
          overflow: hidden;
          background: #1e293b;
          flex-shrink: 0;
        }

        .album-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .album-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }

        .music-track-text {
          overflow: hidden;
        }

        .track-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin: 0;
        }

        .track-artist {
          font-size: 0.75rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin: 0.15rem 0 0;
        }

        .music-center-controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.375rem;
          flex: 1;
          max-width: 580px;
        }

        .music-control-buttons {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .ctrl-btn-ghost {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.375rem;
          border-radius: 50%;
          transition: all 0.15s ease;
        }

        .ctrl-btn-ghost:hover {
          color: var(--text-main);
          background-color: var(--bg-subtle);
        }

        .ctrl-btn-ghost.active-accent {
          color: var(--primary);
        }

        .ctrl-btn-play {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--primary);
          color: #fff;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 2px 8px var(--primary-glow);
        }

        .ctrl-btn-play:hover {
          transform: scale(1.06);
        }

        .music-progress-row {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          width: 100%;
        }

        .time-label {
          font-size: 0.6875rem;
          color: var(--text-muted);
          min-width: 28px;
          font-variant-numeric: tabular-nums;
        }

        .music-seek-slider {
          flex: 1;
          height: 4px;
          accent-color: var(--primary);
          cursor: pointer;
        }

        .music-right-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .music-volume-group {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .volume-slider {
          width: 70px;
          height: 4px;
          accent-color: var(--primary);
          cursor: pointer;
        }

        .music-watch-link {
          font-size: 0.75rem;
          padding: 0.25rem 0.625rem;
        }

        @media (max-width: 768px) {
          .music-bar-container {
            padding: 0.5rem 0.75rem;
          }
          .music-volume-group,
          .music-watch-link {
            display: none;
          }
          .music-track-info {
            max-width: 140px;
            min-width: 120px;
          }
        }
      `}</style>
    </aside>
  );
}

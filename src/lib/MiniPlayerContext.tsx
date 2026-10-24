"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export interface MiniPlayerState {
  videoId: string;
  title: string;
  channelTitle?: string;
  thumbnail?: string;
  currentTime: number;
  isPlaying: boolean;
  isOpen: boolean;
}

interface MiniPlayerContextValue {
  state: MiniPlayerState | null;
  openMiniPlayer: (video: {
    videoId: string;
    title: string;
    channelTitle?: string;
    thumbnail?: string;
    currentTime?: number;
  }) => void;
  closeMiniPlayer: () => void;
  togglePlay: () => void;
  updateTime: (seconds: number) => void;
}

const MiniPlayerContext = createContext<MiniPlayerContextValue | null>(null);

export function MiniPlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MiniPlayerState | null>(null);

  const openMiniPlayer = useCallback(
    (video: {
      videoId: string;
      title: string;
      channelTitle?: string;
      thumbnail?: string;
      currentTime?: number;
    }) => {
      setState({
        videoId: video.videoId,
        title: video.title,
        channelTitle: video.channelTitle,
        thumbnail: video.thumbnail,
        currentTime: video.currentTime || 0,
        isPlaying: true,
        isOpen: true,
      });
    },
    []
  );

  const closeMiniPlayer = useCallback(() => {
    setState((prev) => (prev ? { ...prev, isOpen: false, isPlaying: false } : null));
  }, []);

  const togglePlay = useCallback(() => {
    setState((prev) => (prev ? { ...prev, isPlaying: !prev.isPlaying } : null));
  }, []);

  const updateTime = useCallback((seconds: number) => {
    setState((prev) => (prev ? { ...prev, currentTime: seconds } : null));
  }, []);

  return (
    <MiniPlayerContext.Provider
      value={{
        state,
        openMiniPlayer,
        closeMiniPlayer,
        togglePlay,
        updateTime,
      }}
    >
      {children}
    </MiniPlayerContext.Provider>
  );
}

export function useMiniPlayer() {
  const ctx = useContext(MiniPlayerContext);
  if (!ctx) {
    throw new Error("useMiniPlayer must be used within a MiniPlayerProvider");
  }
  return ctx;
}

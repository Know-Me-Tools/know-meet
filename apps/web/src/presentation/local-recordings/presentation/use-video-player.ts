// TJ-ARCH-MOB-001 compliant
// State and actions of the detail player over a real `<video>` (shape
// recordings-library.md §8, RL-5): play/pause, time, seek, mute, speed and full screen,
// mirrored from the element's own events so the controls never disagree with it.
// Chromium's MediaRecorder WebM often reports an unknown (Infinity) duration and may not
// seek; the recorded length from the library row is used for the scale instead, and a
// seek the browser refuses simply leaves the time where it is. The element's own error
// event is the "playback error" state. Nothing here autoplays.
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface VideoPlayer {
  readonly videoRef: React.RefObject<HTMLVideoElement | null>;
  readonly regionRef: React.RefObject<HTMLElement | null>;
  readonly playing: boolean;
  /** Seconds played. */
  readonly time: number;
  /** Seconds in the file, or the recorded length when the file does not say; null if neither. */
  readonly duration: number | null;
  readonly muted: boolean;
  readonly speed: number;
  readonly fullscreen: boolean;
  readonly fullscreenAvailable: boolean;
  readonly failed: boolean;
  readonly toggle: () => void;
  readonly seek: (seconds: number) => void;
  readonly seekBy: (deltaSeconds: number) => void;
  readonly toggleMuted: () => void;
  readonly setSpeed: (speed: number) => void;
  readonly toggleFullscreen: () => void;
  /** Spread on the `<video>`. */
  readonly videoEvents: React.ComponentProps<"video">;
}

function finiteOrNull(value: number): number | null {
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function useVideoPlayer(recordedSeconds: number | null): VideoPlayer {
  const videoRef = useRef<HTMLVideoElement>(null);
  const regionRef = useRef<HTMLElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [fileDuration, setFileDuration] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [failed, setFailed] = useState(false);
  const fullscreenAvailable = typeof document !== "undefined" && document.fullscreenEnabled;

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === regionRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const duration = fileDuration ?? recordedSeconds;

  const toggle = useCallback(() => {
    const video = videoRef.current;
    if (video === null) return;
    if (video.paused || video.ended) {
      void video.play().catch(() => setPlaying(false));
    } else {
      video.pause();
    }
  }, []);

  const seek = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (video === null) return;
      const end = duration ?? Number.POSITIVE_INFINITY;
      const next = Math.max(0, Math.min(end, seconds));
      video.currentTime = next;
      setTime(video.currentTime);
    },
    [duration],
  );

  const seekBy = useCallback(
    (delta: number) => seek((videoRef.current?.currentTime ?? 0) + delta),
    [seek],
  );

  const toggleMuted = useCallback(() => {
    const video = videoRef.current;
    if (video !== null) video.muted = !video.muted;
  }, []);

  const setSpeed = useCallback((next: number) => {
    const video = videoRef.current;
    if (video !== null) video.playbackRate = next;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const region = regionRef.current;
    if (region === null || !document.fullscreenEnabled) return;
    if (document.fullscreenElement === region)
      void document.exitFullscreen().catch(() => undefined);
    else void region.requestFullscreen().catch(() => undefined);
  }, []);

  const videoEvents: React.ComponentProps<"video"> = {
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded: () => setPlaying(false),
    onTimeUpdate: (event) => setTime(event.currentTarget.currentTime),
    onLoadedMetadata: (event) => setFileDuration(finiteOrNull(event.currentTarget.duration)),
    onDurationChange: (event) => setFileDuration(finiteOrNull(event.currentTarget.duration)),
    onVolumeChange: (event) => setMuted(event.currentTarget.muted),
    onRateChange: (event) => setSpeedState(event.currentTarget.playbackRate),
    onError: () => {
      setFailed(true);
      setPlaying(false);
    },
  };

  return {
    videoRef,
    regionRef,
    playing,
    time,
    duration,
    muted,
    speed,
    fullscreen,
    fullscreenAvailable,
    failed,
    toggle,
    seek,
    seekBy,
    toggleMuted,
    setSpeed,
    toggleFullscreen,
    videoEvents,
  };
}

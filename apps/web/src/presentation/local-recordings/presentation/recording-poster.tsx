// TJ-ARCH-MOB-001 compliant
// The card poster (shape recordings-library.md §2 assumption, §4): a frame of the
// recording itself, from a muted `<video preload="metadata">` seeked to 1 s (or to the
// middle of a shorter file). It never plays and is hidden from assistive technology;
// the card's name carries the content. Until a frame shows, or when the file has no
// readable frame, the poster is the `tile` fill with the `film` glyph. The URL is a
// `blob:` object URL of the local file (RL-12); nothing is fetched.
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";
import { useState } from "react";

const FRAME_SECONDS = 1;

function seekToFrame(event: React.SyntheticEvent<HTMLVideoElement>): void {
  const video = event.currentTarget;
  const duration = Number.isFinite(video.duration) ? video.duration : FRAME_SECONDS * 2;
  video.currentTime = Math.min(FRAME_SECONDS, duration / 2);
}

interface RecordingPosterProps {
  /** Object URL of the file; null while it opens or when it cannot be opened. */
  readonly url: string | null;
  readonly variant?: "card" | "thumb";
  /** Shown instead of the frame (a recording still being written). */
  readonly children?: React.ReactNode;
}

export function RecordingPoster({ url, variant = "card", children }: RecordingPosterProps) {
  const [frame, setFrame] = useState<"waiting" | "shown" | "failed">("waiting");
  const showVideo = url !== null && frame !== "failed" && children === undefined;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative grid aspect-video place-items-center overflow-hidden bg-tile text-muted-foreground",
        variant === "thumb" ? "rounded-8" : "",
      )}
    >
      {children ?? (frame === "shown" ? null : <KmIcon name="film" className="size-7" />)}
      {showVideo ? (
        <video
          src={url}
          preload="metadata"
          muted
          playsInline
          tabIndex={-1}
          onLoadedMetadata={seekToFrame}
          onSeeked={() => setFrame("shown")}
          onError={() => setFrame("failed")}
          className={cn(
            "absolute inset-0 size-full object-cover",
            frame === "shown" ? "" : "opacity-0",
          )}
        />
      ) : null}
    </div>
  );
}

// TJ-ARCH-MOB-001 compliant
// `#detail:<id>:transcript`: speaker-attributed transcript in chapters. Each line
// is a button that seeks the player; the current line is marked (ember-soft fill
// plus aria-current) and, with "Follow playback" on, scrolled into view inside the
// focusable transcript region. Search highlights matches with <mark> and announces
// the match count politely.
import { Badge } from "@know-meet/ui/components/badge";
import { Button } from "@know-meet/ui/components/button";
import { Checkbox } from "@know-meet/ui/components/checkbox";
import { Input } from "@know-meet/ui/components/input";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { copyText } from "../../shared/copy-text";
import { formatDuration, formatNumber } from "../../workspace/application/format";
import type { Recording, Workspace } from "../../workspace/domain/workspace";
import type { TranscriptChapter } from "../domain/recording-details";
import { agentByName, type FlatSegment } from "../application/recordings-model";
import type { Playback } from "./use-playback";

interface TranscriptPanelProps {
  readonly workspace: Workspace;
  readonly recording: Recording;
  readonly chapters: readonly TranscriptChapter[];
  readonly segments: readonly FlatSegment[];
  readonly currentIndex: number;
  readonly playback: Playback;
}

function clock(seconds: number): string {
  return formatDuration(seconds * 1000);
}

function highlight(text: string, query: string): ReactNode {
  if (query === "") return text;
  const parts: ReactNode[] = [];
  const lower = text.toLowerCase();
  const needle = query.toLowerCase();
  let from = 0;
  let at = lower.indexOf(needle, from);
  while (at > -1) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(
      <mark key={at} className="rounded-3 bg-amber-soft text-inherit">
        {text.slice(at, at + query.length)}
      </mark>,
    );
    from = at + query.length;
    at = lower.indexOf(needle, from);
  }
  if (from < text.length) parts.push(text.slice(from));
  return parts;
}

export function TranscriptPanel({ workspace, recording, chapters, segments, currentIndex, playback }: TranscriptPanelProps) {
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const q = query.trim();
  const matches = q === "" ? 0 : segments.filter((s) => s.text.toLowerCase().includes(q.toLowerCase())).length;
  const count =
    q === "" ? `${segments.length} lines` : `${matches}${matches === 1 ? " line matches" : " lines match"} “${q}”`;

  useEffect(() => {
    const list = listRef.current;
    if (list === null || !playback.follow || q !== "" || currentIndex < 0) return;
    const line = list.querySelector<HTMLElement>(`[data-seg="${currentIndex}"]`);
    if (line !== null) list.scrollTop = Math.max(0, line.offsetTop - 48);
  }, [currentIndex, playback.follow, q]);

  let index = 0;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-s2">
        <h2 id="tab-h">Transcript</h2>
        <div className="flex flex-wrap items-center gap-s2">
          <span className="text-sm text-muted-foreground">
            {formatNumber(recording.transcriptWords)} words · speaker-attributed
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              void copyText(segments.map((s) => `[${clock(s.t)}] ${s.who}: ${s.text}`).join("\n"))
            }
          >
            <KmIcon name="copy" className="size-4" />
            <span>Copy</span>
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-s3">
        <div className="grid min-w-0 flex-[1_1_200px] gap-1.5">
          <label htmlFor="tx-q" className="text-sm font-semibold">
            Search transcript
          </label>
          <div className="relative">
            <Input
              id="tx-q"
              type="search"
              placeholder="Find a word or phrase"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="peer pl-[42px]"
            />
            <KmIcon
              name="search"
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-on-control peer-focus-visible:text-on-focus"
            />
          </div>
        </div>
        <label htmlFor="tx-follow" className="flex min-h-11 cursor-pointer items-start gap-s3 py-s2">
          <Checkbox
            id="tx-follow"
            checked={playback.follow}
            onCheckedChange={(checked) => playback.setFollow(checked)}
            className="mt-0.5"
          />
          <span className="text-sm">Follow playback</span>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-s2">
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {count}
        </span>
        <span className="text-xs text-muted-foreground">Select a line to jump the player to that moment.</span>
      </div>
      <div
        ref={listRef}
        tabIndex={0}
        role="region"
        aria-label="Transcript"
        className={cn(
          "relative grid max-h-[620px] gap-s4 overflow-y-auto overscroll-contain rounded-tile bg-surface p-s3 shadow-(--shadow-card)",
          focusFillClass,
          "focus-visible:**:bg-transparent! focus-visible:**:text-inherit!",
        )}
      >
        {chapters.map((chapter, chapterIndex) => (
          <section key={chapter.title} aria-labelledby={`ch-${chapterIndex}`}>
            <h3
              id={`ch-${chapterIndex}`}
              className="px-s3 font-mono text-sm tracking-[0.08em] text-muted-foreground uppercase"
            >
              {clock(chapter.segments[0]?.t ?? 0)} · {chapter.title}
            </h3>
            <ol className="mt-s2 grid gap-0.5">
              {chapter.segments.map((segment) => {
                const at = index++;
                const isCurrent = at === currentIndex;
                const agent = agentByName(workspace, segment.who) !== null;
                return (
                  <li key={`${segment.t}-${segment.who}`}>
                    <button
                      type="button"
                      data-seg={at}
                      aria-current={isCurrent ? "true" : undefined}
                      aria-label={`${clock(segment.t)}, ${segment.who}: ${segment.text}`}
                      onClick={() => playback.seek(segment.t)}
                      className={cn(
                        "grid w-full grid-cols-[56px_minmax(0,1fr)] gap-s3 rounded-base p-s3 text-left text-foreground transition-colors duration-(--dur-fast) [@media(hover:hover)]:hover:bg-card-hov",
                        isCurrent ? "bg-ember-soft" : "bg-transparent",
                        focusFillClass,
                      )}
                    >
                      <span
                        className={cn(
                          "pt-0.5 font-mono text-xs tabular-nums",
                          isCurrent ? "text-ember-text" : "text-muted-foreground",
                        )}
                      >
                        {clock(segment.t)}
                      </span>
                      <span>
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          <span>{segment.who}</span>
                          {agent ? (
                            <Badge variant="cyan" className="min-h-5 px-1.5">
                              Agent
                            </Badge>
                          ) : null}
                        </span>
                        <span className="block text-sm leading-[1.55] [overflow-wrap:anywhere]">
                          {highlight(segment.text, q)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}

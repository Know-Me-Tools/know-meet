import { Button } from "@know-meet/ui/components/button";
import { Input } from "@know-meet/ui/components/input";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { LocalTranscriptLine } from "../../../guest-meeting/local-transcript-services";

const MAX_VISIBLE_LINES = 40;
const SEARCH_MIN_DELAY_MS = 120;

interface SearchResult {
  readonly query: string;
  readonly lines: readonly LocalTranscriptLine[];
  readonly matches: readonly number[] | null;
}

function timestamp(ms: number): string {
  const seconds = Math.floor(ms / 1_000);
  const remainder = String(seconds % 60).padStart(2, "0");
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}:${remainder}`;
  const minutes = String(Math.floor(seconds / 60) % 60).padStart(2, "0");
  return `${Math.floor(seconds / 3_600)}:${minutes}:${remainder}`;
}

export function TimedTranscript({
  lines,
  searchLines,
  live = false,
  omitted = false,
}: {
  readonly lines: readonly LocalTranscriptLine[];
  readonly searchLines: (query: string) => Promise<readonly number[]>;
  readonly live?: boolean;
  readonly omitted?: boolean;
}) {
  const id = useId();
  const search = useRef<HTMLInputElement>(null);
  const timeline = useRef<HTMLDivElement>(null);
  const result = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [opened, setOpened] = useState<number | null>(null);
  const [following, setFollowing] = useState(true);
  const searching = /[\p{L}\p{N}]/u.test(query);
  const reply = searchResult?.query === query ? searchResult : null;
  const ordered = useMemo(
    () => [...lines].sort((a, b) => a.startMs - b.startMs || a.id - b.id),
    [lines],
  );
  const found = useMemo(() => {
    if (!searching) return ordered;
    const matchedIds = new Set(reply?.matches ?? []);
    return ordered.filter((line) => matchedIds.has(line.id));
  }, [ordered, reply, searching]);
  const pending = searching && lines.length > 0 && reply?.lines !== lines;
  const searchUnavailable = searching && !pending && reply?.matches === null;
  const display = searching ? found.slice(0, MAX_VISIBLE_LINES) : found.slice(-MAX_VISIBLE_LINES);
  const selected = found.find((line) => line.id === opened);
  const selectedId = selected?.id;

  useEffect(() => {
    if (!searching || lines.length === 0) return;
    let current = true;
    const update = (matches: readonly number[] | null) => {
      if (current) setSearchResult({ query, lines, matches });
    };
    const debounce = window.setTimeout(() => {
      void searchLines(query).then(update, () => update(null));
    }, SEARCH_MIN_DELAY_MS);
    return () => {
      current = false;
      window.clearTimeout(debounce);
    };
  }, [lines, query, searchLines, searching]);

  useLayoutEffect(() => {
    const panel = timeline.current;
    if (panel === null) return;
    if (live && following && !searching && selectedId === undefined) {
      panel.scrollTop = found.length > 0 ? panel.scrollHeight : 0;
    }
  }, [found, following, live, searching, selectedId]);

  useLayoutEffect(() => {
    if (selectedId !== undefined) result.current?.focus();
  }, [selectedId]);

  const resetSearch = () => {
    setQuery("");
    setSearchResult(null);
    setOpened(null);
    setFollowing(true);
    search.current?.focus();
  };

  return (
    <div className="grid min-w-0 gap-s2">
      <label className="text-sm" htmlFor={id}>
        Search settled transcript
      </label>
      <div className="flex flex-wrap items-center gap-s2">
        <Input
          ref={search}
          id={id}
          type="search"
          value={query}
          maxLength={200}
          autoComplete="off"
          className="min-w-0 flex-1"
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            setSearchResult(null);
            setOpened(null);
            if (timeline.current !== null) timeline.current.scrollTop = 0;
          }}
        />
        {live && (query !== "" || !following || selected !== undefined) ? (
          <Button type="button" variant="secondary" size="sm" onClick={resetSearch}>
            Back to live
          </Button>
        ) : !live && query !== "" ? (
          <Button type="button" variant="secondary" size="sm" onClick={resetSearch}>
            Clear search
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground" role="status">
        {searching
          ? searchUnavailable
            ? "Search is unavailable. Clear the search and try again."
            : found.length === 0
              ? pending
                ? "Searching settled text…"
                : "No settled text matches yet."
              : `${found.length} ${found.length === 1 ? "match" : "matches"}.`
          : found.length === 0
            ? "No settled text yet."
            : "Latest settled text."}
        {found.length > display.length
          ? " Showing up to 40 lines. Refine your search for earlier text."
          : ""}
        {omitted ? " Earlier lines exceeded this device’s session limit." : ""}
      </p>
      {selected === undefined ? null : (
        <section
          ref={result}
          aria-label="Settled transcript result"
          tabIndex={-1}
          className="break-words rounded-base bg-card p-s3 focus:bg-focus focus:text-on-focus"
        >
          <p>
            <time
              dateTime={`PT${selected.startMs / 1_000}S`}
              className="font-semibold tabular-nums"
            >
              {timestamp(selected.startMs)}
            </time>{" "}
            <span className="font-semibold">{selected.speaker ?? "Speaker unknown"}</span> ·{" "}
            {selected.text}
          </p>
        </section>
      )}
      <div
        ref={timeline}
        className="max-h-[16rem] overflow-y-auto overscroll-contain"
        onScroll={
          live && !searching && selected === undefined
            ? ({ currentTarget }) => {
                const distance =
                  currentTarget.scrollHeight - currentTarget.clientHeight - currentTarget.scrollTop;
                setFollowing(distance < 2);
              }
            : undefined
        }
      >
        <ol className="grid gap-s1 text-sm">
          {display.map((line) => (
            <li key={line.id} className="min-w-0 break-words">
              {line.gap ? (
                <p className="px-s2 py-s1">
                  <time dateTime={`PT${line.startMs / 1_000}S`}>{timestamp(line.startMs)}</time> ·{" "}
                  {line.text}
                </p>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  aria-pressed={line.id === opened}
                  className="w-full min-w-0 justify-start gap-s2 px-s2 py-s1 text-left text-sm font-normal whitespace-normal"
                  onClick={() => setOpened((current) => (current === line.id ? null : line.id))}
                >
                  <time
                    dateTime={`PT${line.startMs / 1_000}S`}
                    className="font-semibold tabular-nums"
                  >
                    {timestamp(line.startMs)}
                  </time>
                  <span className="min-w-0 break-words">
                    <span className="font-semibold">{line.speaker ?? "Speaker unknown"}</span> ·{" "}
                    {line.text}
                  </span>
                </Button>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

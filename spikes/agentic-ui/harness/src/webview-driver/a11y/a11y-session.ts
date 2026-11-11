/**
 * Gate 16.4: one Tauri app launch driven with trusted OS input. Wraps the
 * km-input helper (trusted-input/km-input.swift, CoreGraphics events), reads the
 * agent's events from the collector's JSONL file and maps viewport rectangles to
 * global screen points.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPORTS_DIR } from "../../shared/paths.ts";
import type { A11yAgentConfig, A11yFinal, A11yKind, A11yState, ElementDesc, TargetRect } from "./a11y-types.ts";
import { buildA11yAgentScript } from "./build-a11y-agent.ts";

/** Harness origin; KM_HARNESS_URL selects a second instance (the shell CSP must allow it). */
export const HARNESS = process.env["KM_HARNESS_URL"] ?? "http://127.0.0.1:4317";
export const KM_INPUT = join(REPORTS_DIR, "webview-driver", "km-input");
const SPIKE_REPORT_DIR = join(REPORTS_DIR, "spike-report");

/** macOS virtual key codes (HIToolbox Events.h). */
export const KEY = { tab: 48, enter: 36, space: 49, a: 0, f16: 106, f17: 64, f18: 79, f19: 80 } as const;

/** Trace entry when key events stop reaching the web content (focus moved to native window chrome). */
export const OUTSIDE_WEBVIEW: ElementDesc = { tag: "<outside-webview>", testid: null, role: null, name: "", a2uiId: null, interruptId: null, type: null };

export interface TraceStep {
  readonly press: string;
  readonly active: ElementDesc;
}

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

interface EventLine {
  readonly kind: string;
  readonly event?: string;
  readonly detail?: string;
  readonly verdict?: { readonly problems: readonly string[] };
}

function input(args: readonly string[]): string {
  const r = spawnSync(KM_INPUT, args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`km-input ${args.join(" ")}: exit ${r.status ?? "signal"} ${r.stderr.trim()}`);
  return r.stdout.trim();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function describe(el: ElementDesc): string {
  const id = el.testid ?? (el.a2uiId === null ? null : `a2ui:${el.a2uiId}`);
  return `${el.tag}${el.type === null ? "" : `[type=${el.type}]`}${id === null ? "" : `#${id}`}${el.name === "" ? "" : ` "${el.name.slice(0, 40)}"`}`;
}

export class A11ySession {
  readonly warnings: string[] = [];
  private app: ChildProcess | null = null;
  private window: Rect | null = null;
  private lastSeq = 0;
  private readonly file: string;
  ready: (A11yState & { prompt: string }) | null = null;

  readonly config: A11yAgentConfig;
  private readonly binary: string;

  constructor(config: A11yAgentConfig, binary: string) {
    this.config = config;
    this.binary = binary;
    this.file = join(SPIKE_REPORT_DIR, `${config.runId}.jsonl`);
  }

  static create(binary: string, prototype: string, kind: A11yKind, scenarioId: string, surfaceId: string | null, judge: boolean): A11ySession {
    const runId = `a11y-${prototype}-${kind}-${scenarioId.replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
    return new A11ySession({ runId, prototype, harnessUrl: HARNESS, appUrl: "tauri://localhost/index.html", scenarioId, sessionId: `${runId}-s0`, kind, surfaceId, judge }, binary);
  }

  get pid(): number {
    return this.app?.pid ?? 0;
  }

  get jsonlPath(): string {
    return this.file;
  }

  async launch(): Promise<void> {
    const dir = join(REPORTS_DIR, "webview-driver");
    mkdirSync(dir, { recursive: true });
    const script = join(dir, `${this.config.runId}.js`);
    writeFileSync(script, buildA11yAgentScript(this.config));
    const log = openSync(join(dir, `${this.config.runId}.app.log`), "w");
    this.app = spawn(this.binary, [], { env: { ...process.env, KM_DRIVER_SCRIPT: script }, stdio: ["ignore", log, log] });
    const ready = await this.waitEvent("a11y-ready", () => true, 40_000);
    this.ready = JSON.parse(ready.detail ?? "{}") as A11yState & { prompt: string };
    this.front();
    await sleep(400);
    this.window = JSON.parse(input(["window", String(this.pid)])) as Rect;
    await this.refocus();
  }

  /** Makes the web view first responder again: a trusted click on an empty strip at the right edge. */
  async refocus(): Promise<void> {
    const vp = this.ready?.viewport ?? { w: 1280, h: 688 };
    this.click({ x: vp.w - 6, y: vp.h / 2, w: 2, h: 2 }, "neutral");
    await sleep(200);
  }

  stop(): void {
    if (this.app !== null && this.app.exitCode === null) this.app.kill("SIGTERM");
  }

  private lines(): EventLine[] {
    if (!existsSync(this.file)) return [];
    return readFileSync(this.file, "utf8").split("\n").filter((l) => l !== "").map((l) => JSON.parse(l) as EventLine);
  }

  async waitEvent(event: string, accept: (detail: unknown) => boolean, timeoutMs = 20_000): Promise<EventLine> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const hit = this.lines().find((l) => l.kind === "event" && l.event === event && accept(JSON.parse(l.detail ?? "null")));
      if (hit !== undefined) return hit;
      if (this.app?.exitCode !== null && this.app?.exitCode !== undefined) throw new Error(`app exited (${this.app.exitCode}) while waiting for ${event}`);
      await sleep(60);
    }
    throw new Error(`timed out after ${timeoutMs} ms waiting for ${event}`);
  }

  states(event: string): A11yState[] {
    return this.lines().filter((l) => l.kind === "event" && l.event === event).map((l) => JSON.parse(l.detail ?? "{}") as A11yState);
  }

  verdict(): readonly string[] | null {
    return this.lines().find((l) => l.kind === "result")?.verdict?.problems ?? null;
  }

  /** Activates the app and records a warning if it is not frontmost afterwards (HID events go to the key window). */
  front(): void {
    const { pid } = JSON.parse(input(["front", String(this.pid)])) as { pid: number };
    if (pid !== this.pid) {
      this.warnings.push(`app not frontmost before input (frontmost pid ${pid})`);
      // Never send trusted keys or clicks into another application (someone may be using the machine).
      if (process.env["KM_STRICT_FRONT"] === "1") throw new Error(`app not frontmost (frontmost pid ${pid}); input refused`);
    }
  }

  key(code: number, mods = ""): void {
    this.front();
    input(mods === "" ? ["key", String(code)] : ["key", String(code), mods]);
  }

  type(text: string): void {
    this.front();
    input(["type", text]);
  }

  /** Pointer click at the centre of a viewport rectangle. */
  click(rect: TargetRect, label: string): void {
    if (this.window === null || this.ready === null) throw new Error("not launched");
    const vh = this.ready.viewport.h;
    if (rect.y + rect.h / 2 < 0 || rect.y + rect.h / 2 > vh) this.warnings.push(`click ${label}: centre outside the viewport (y=${rect.y}, h=${vh})`);
    const chrome = this.window.h - vh;
    const x = this.window.x + rect.x + rect.w / 2;
    const y = this.window.y + chrome + rect.y + rect.h / 2;
    this.front();
    input(["click", x.toFixed(1), y.toFixed(1)]);
  }

  /** F19: the agent posts its current state. */
  async state(timeoutMs = 10_000): Promise<A11yState> {
    const after = this.lastSeq;
    this.key(KEY.f19);
    const line = await this.waitEvent("a11y-state", (d) => (d as A11yState).seq > after && (d as A11yState).reason === "F19", timeoutMs);
    const s = JSON.parse(line.detail ?? "{}") as A11yState;
    this.lastSeq = Math.max(this.lastSeq, s.seq);
    return s;
  }

  /** F18: the agent runs axe, then posts its state. */
  async axe(): Promise<A11yState> {
    const after = this.lastSeq;
    this.key(KEY.f18);
    const line = await this.waitEvent("a11y-state", (d) => (d as A11yState).seq > after && (d as A11yState).reason === "F18", 30_000);
    const s = JSON.parse(line.detail ?? "{}") as A11yState;
    this.lastSeq = Math.max(this.lastSeq, s.seq);
    return s;
  }

  /** F17: the agent posts its logs (and, when judging, a result the collector compares). */
  async final(): Promise<A11yFinal> {
    this.key(KEY.f17);
    const line = await this.waitEvent("a11y-final", () => true, 20_000);
    return JSON.parse(line.detail ?? "{}") as A11yFinal;
  }

  /** F16: the agent posts a `result` report; returns the collector's problems (empty = conformant). */
  async judge(): Promise<readonly string[]> {
    this.key(KEY.f16);
    await this.waitEvent("a11y-judged", () => true, 15_000);
    return this.verdict() ?? ["no verdict recorded"];
  }

  /** Waits until the agent has posted at least `count` settle events. */
  async waitSettleCount(count: number, timeoutMs = 60_000): Promise<A11yState> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const all = this.states("a11y-settled");
      const last = all[count - 1];
      if (last !== undefined) return last;
      await sleep(80);
    }
    throw new Error(`timed out waiting for settle #${count}`);
  }

  /** State, refocusing the web view once if the F19 probe does not reach the page. */
  async stateRefocus(): Promise<A11yState> {
    try {
      return await this.state(3_000);
    } catch {
      this.warnings.push("F19 probe lost (focus outside the web content); refocused with a click");
      await this.refocus();
      return this.state();
    }
  }

  async target(key: string): Promise<TargetRect> {
    const s = await this.stateRefocus();
    const rect = s.targets[key];
    if (rect === undefined) throw new Error(`target ${key} not on the page (have: ${Object.keys(s.targets).join(", ")})`);
    return rect;
  }

  /** Trusted pointer click into the composer, typed prompt, pointer click on submit. */
  async submitPrompt(prompt: string): Promise<void> {
    this.click(await this.target("km-composer-input"), "composer");
    await sleep(150);
    let value = "";
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      if (attempt > 1) {
        this.warnings.push(`typing attempt ${attempt - 1} arrived as ${JSON.stringify(value)}; retyped`);
        this.key(KEY.a, "cmd");
      }
      this.type(prompt);
      for (let i = 0; i < 10; i += 1) {
        await sleep(150);
        value = (await this.state()).composer;
        if (value.length >= prompt.length) break;
      }
      if (value.length === prompt.length) break;
    }
    this.typed = value;
    if (value !== prompt) this.warnings.push(`composer received ${JSON.stringify(value)} for typed ${JSON.stringify(prompt)}`);
    this.click(await this.target("km-composer-submit"), "submit");
  }

  /** What the composer held when the prompt was submitted. */
  typed = "";

  async waitSettled(timeoutMs = 180_000): Promise<A11yState> {
    const line = await this.waitEvent("a11y-settled", () => true, timeoutMs);
    return JSON.parse(line.detail ?? "{}") as A11yState;
  }

  /** Presses Tab (with `mods`) until `stop` holds or `max` presses; records document.activeElement after each. */
  async tabUntil(mods: string, max: number, stop: (active: ElementDesc, i: number) => boolean): Promise<TraceStep[]> {
    const trace: TraceStep[] = [];
    let previous: ElementDesc | null = null;
    for (let i = 0; i < max; i += 1) {
      this.key(KEY.tab, mods);
      await sleep(80);
      let active: ElementDesc;
      try {
        active = (await this.state(2_500)).active;
        if (previous !== null && JSON.stringify(previous) === JSON.stringify(active)) {
          // A Tab press occasionally has no effect; press once more and say so in the evidence.
          this.warnings.push(`Tab press ${i + 1} left focus on ${describe(active)}; pressed again`);
          this.key(KEY.tab, mods);
          await sleep(120);
          active = (await this.state(2_500)).active;
        }
      } catch {
        // The F19 probe key did not reach the page: keyboard focus left the web content.
        active = OUTSIDE_WEBVIEW;
      }
      previous = active;
      trace.push({ press: mods === "" ? "Tab" : `${mods}+Tab`, active });
      if (active === OUTSIDE_WEBVIEW) {
        await this.refocus();
        break;
      }
      if (stop(active, i)) break;
    }
    return trace;
  }

  async sessionSummary(): Promise<{ requestCount: number; a2uiActions: { name: string; surfaceId: string; sourceComponentId?: string; context: unknown }[] } | null> {
    const res = await fetch(`${HARNESS}/sessions/${encodeURIComponent(this.config.sessionId)}`);
    if (res.status === 404) return null;
    const body = (await res.json()) as { summary: { requestCount: number; a2uiActions: { name: string; surfaceId: string; sourceComponentId?: string; context: unknown }[] } };
    return body.summary;
  }

  async waitRequestsAbove(n: number, timeoutMs = 15_000): Promise<number> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const c = (await this.sessionSummary())?.requestCount ?? 0;
      if (c > n) return c;
      await sleep(100);
    }
    return (await this.sessionSummary())?.requestCount ?? 0;
  }
}

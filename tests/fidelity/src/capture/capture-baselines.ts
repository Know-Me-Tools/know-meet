/**
 * c03 task 3.2: capture prototype baselines for every in-scope route/state of
 * the c02 inventory x both themes x 375/768/1024/1440, plus the reference
 * captures. Serves docs/design read-only; writes only tests/fidelity/baselines.
 *
 *   node tests/fidelity/src/capture/capture-baselines.ts
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { type Browser, chromium } from "@playwright/test";
import {
  CAPTURE_ENVIRONMENT,
  contextOptions,
  prepareContext,
  settle,
} from "../support/capture-environment.ts";
import { sha256, sha256File } from "../support/digests.ts";
import {
  assertUniqueStems,
  baselineRelPath,
  type InventoryEntry,
  inScopeEntries,
  loadInventory,
  type Theme,
} from "../support/inventory.ts";
import {
  BASELINE_MANIFEST,
  BASELINES_DIR,
  DESIGN_DIR,
  FONTS_DIR,
  INVENTORY_JSON,
  REPO_ROOT,
  repoPath,
  TOKENS_JSON,
} from "../support/repo-paths.ts";
import {
  captureSubject,
  driveState,
  PROTOTYPE_SELECTORS,
  planState,
  type RenderTarget,
} from "../support/state-drivers.ts";
import type {
  BaselineManifest,
  BaselineRecord,
  ReferenceRecord,
  SkippedRecord,
} from "./baseline-manifest.ts";
import { REFERENCE_TARGETS } from "./reference-captures.ts";
import { startStaticServer } from "./static-server.ts";

const CONCURRENCY = 4;
const SHARED_SOURCES = [
  "docs/design/prototype/assets/km.css",
  "docs/design/prototype/assets/km.js",
  "docs/design/prototype/assets/favicon.svg",
  "docs/design/brand.css",
  "docs/design/live/assets/km.css",
  "docs/design/live/assets/room.css",
  "docs/design/live/assets/live-room.js",
];

interface Job {
  readonly entry: InventoryEntry;
  readonly theme: Theme;
  readonly viewport: number;
}

interface Collected {
  readonly baselines: BaselineRecord[];
  readonly skipped: SkippedRecord[];
  readonly reference: ReferenceRecord[];
  readonly blocked: string[];
  readonly pageErrors: Array<{ capture: string; message: string }>;
}

function pngSize(file: Buffer): { width: number; height: number } {
  return { width: file.readUInt32BE(16), height: file.readUInt32BE(20) };
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], { cwd: REPO_ROOT, encoding: "utf8" }).trim();
}

function prototypeTarget(origin: string): RenderTarget {
  return {
    name: "prototype",
    urlFor: (entry) => `${origin}/${entry.file.replace(/^docs\/design\//, "")}${entry.hash}`,
    selector: (role) => PROTOTYPE_SELECTORS[role],
  };
}

async function captureJob(
  browser: Browser,
  origin: string,
  job: Job,
  out: Collected,
): Promise<void> {
  const { entry, theme, viewport } = job;
  const plan = planState(entry, viewport);
  const label = `${entry.id} ${theme} ${viewport}`;
  if (!plan.applicable) {
    out.skipped.push({
      stateId: entry.id,
      theme,
      viewport,
      disposition: "not-applicable",
      reason: plan.notApplicableReason ?? "",
    });
    return;
  }
  const context = await browser.newContext(contextOptions(viewport));
  try {
    await prepareContext(context, {
      theme,
      access: entry.access,
      allowedOrigin: origin,
      fontBaseUrl: `${origin}/__fonts`,
      blocked: out.blocked,
    });
    const page = await context.newPage();
    page.on("pageerror", (error) =>
      out.pageErrors.push({ capture: label, message: error.message }),
    );
    const target = prototypeTarget(origin);
    await driveState(page, target, entry, plan);
    const { subject, fullPage } = captureSubject(page, target, plan);
    const image = await subject.screenshot({
      ...CAPTURE_ENVIRONMENT.screenshot,
      ...(fullPage ? { fullPage: true } : {}),
    });
    const rel = baselineRelPath(entry.id, theme, viewport);
    mkdirSync(dirname(join(BASELINES_DIR, rel)), { recursive: true });
    writeFileSync(join(BASELINES_DIR, rel), image);
    out.baselines.push({
      stateId: entry.id,
      theme,
      viewport,
      path: rel,
      sha256: sha256(image),
      ...pngSize(image),
      sourcePath: entry.file,
      sourceSha256: sha256File(repoPath(entry.file)),
      url: target.urlFor(entry).replace(origin, ""),
      method: plan.method,
      region: plan.region.kind === "element" ? `element:${plan.region.role}` : plan.region.kind,
    });
  } catch (error) {
    const reason = error instanceof Error ? (error.message.split("\n")[0] ?? "") : String(error);
    out.skipped.push({ stateId: entry.id, theme, viewport, disposition: "capture-failed", reason });
  } finally {
    await context.close();
  }
}

async function captureReferences(
  browser: Browser,
  origin: string,
  themes: readonly Theme[],
  viewports: readonly number[],
  out: Collected,
): Promise<void> {
  for (const ref of REFERENCE_TARGETS) {
    for (const theme of themes) {
      for (const viewport of viewports) {
        const context = await browser.newContext(contextOptions(viewport));
        try {
          await prepareContext(context, {
            theme,
            access: "guest",
            allowedOrigin: origin,
            fontBaseUrl: `${origin}/__fonts`,
            blocked: out.blocked,
          });
          const page = await context.newPage();
          await page.goto(`${origin}/${ref.page}`);
          await settle(page);
          const selector = await ref.drive(page);
          const image = await page
            .locator(selector)
            .first()
            .screenshot(CAPTURE_ENVIRONMENT.screenshot);
          const rel = `reference/${theme}/${viewport}/${ref.referenceId.replaceAll(".", "-")}.png`;
          mkdirSync(dirname(join(BASELINES_DIR, rel)), { recursive: true });
          writeFileSync(join(BASELINES_DIR, rel), image);
          const sourcePath = `docs/design/${ref.page}`;
          out.reference.push({
            referenceId: ref.referenceId,
            theme,
            viewport,
            path: rel,
            sha256: sha256(image),
            sourcePath,
            sourceSha256: sha256File(repoPath(sourcePath)),
            method: ref.method,
            gating: false,
          });
        } catch (error) {
          const reason =
            error instanceof Error ? (error.message.split("\n")[0] ?? "") : String(error);
          out.pageErrors.push({
            capture: `${ref.referenceId} ${theme} ${viewport}`,
            message: `reference capture failed: ${reason}`,
          });
        } finally {
          await context.close();
        }
      }
    }
  }
}

async function runPool(jobs: readonly Job[], worker: (job: Job) => Promise<void>): Promise<void> {
  let next = 0;
  const lane = async (): Promise<void> => {
    while (next < jobs.length) {
      const job = jobs[next];
      next += 1;
      if (job !== undefined) await worker(job);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, lane));
}

async function main(): Promise<void> {
  const inventory = loadInventory();
  const entries = inScopeEntries(inventory);
  assertUniqueStems(entries);
  const { themes, viewports } = inventory.captureMatrix;
  for (const dir of ["dark", "light", "reference"])
    rmSync(join(BASELINES_DIR, dir), { recursive: true, force: true });

  const server = await startStaticServer(DESIGN_DIR, FONTS_DIR);
  const browser = await chromium.launch();
  const browserVersion = browser.version();
  const out: Collected = { baselines: [], skipped: [], reference: [], blocked: [], pageErrors: [] };
  try {
    const jobs: Job[] = entries.flatMap((entry) =>
      themes.flatMap((theme) => viewports.map((viewport) => ({ entry, theme, viewport }))),
    );
    await runPool(jobs, (job) => captureJob(browser, server.origin, job, out));
    await captureReferences(browser, server.origin, themes, viewports, out);
  } finally {
    await browser.close();
    await server.close();
  }
  writeManifest(
    inventory.version,
    entries.length,
    themes.length * viewports.length * entries.length,
    browserVersion,
    out,
  );
}

function writeManifest(
  version: string,
  states: number,
  expected: number,
  browserVersion: string,
  out: Collected,
): void {
  const baselines = [...out.baselines].sort((a, b) => a.path.localeCompare(b.path));
  const count = (d: SkippedRecord["disposition"]): number =>
    out.skipped.filter((s) => s.disposition === d).length;
  const pkg = JSON.parse(
    readFileSync(
      join(dirname(BASELINES_DIR), "node_modules", "@playwright", "test", "package.json"),
      "utf8",
    ),
  ) as { version: string };
  const manifest: BaselineManifest = {
    schema: "know-meet-baselines/v1",
    capturedAt: new Date().toISOString(),
    capturedBy: "bdd-quality (know-meet-team), c03 task 3.2",
    change: "c03-value-scenarios-and-baselines",
    git: {
      head: git(["rev-parse", "HEAD"]),
      designTreeStatus: git(["status", "--porcelain", "--", "docs/design"]) || "clean",
    },
    inventory: {
      path: "docs/design/screen-inventory/route-inventory.json",
      sha256: sha256File(INVENTORY_JSON),
      version,
    },
    tokens: { path: "docs/design/tokens.json", sha256: sha256File(TOKENS_JSON) },
    sharedSources: SHARED_SOURCES.map((path) => ({ path, sha256: sha256File(repoPath(path)) })),
    fonts: [
      "space-grotesk-variable.woff2",
      "inter-regular.woff2",
      "inter-medium.woff2",
      "inter-semibold.woff2",
      "jetbrains-mono-medium.woff2",
      "jetbrains-mono-semibold.woff2",
    ].map((file) => ({
      path: `packages/design-tokens/fonts/${file}`,
      sha256: sha256File(join(FONTS_DIR, file)),
    })),
    environment: {
      ...CAPTURE_ENVIRONMENT,
      browser: `chromium ${browserVersion} (headless shell)`,
      playwright: pkg.version,
      platform: `${process.platform}-${process.arch}`,
      node: process.version,
    },
    counts: {
      inScopeStates: states,
      expectedCaptures: expected,
      captured: baselines.length,
      notApplicable: count("not-applicable"),
      unreachable: count("unreachable"),
      failed: count("capture-failed"),
      reference: out.reference.length,
    },
    baselineSetDigest: sha256(baselines.map((b) => `${b.path}\0${b.sha256}\n`).join("")),
    baselines,
    skipped: [...out.skipped].sort((a, b) =>
      `${a.stateId}${a.theme}${a.viewport}`.localeCompare(`${b.stateId}${b.theme}${b.viewport}`),
    ),
    reference: [...out.reference].sort((a, b) => a.path.localeCompare(b.path)),
    blockedRequests: [...new Set(out.blocked)].sort(),
    pageErrors: out.pageErrors,
  };
  writeFileSync(BASELINE_MANIFEST, `${JSON.stringify(manifest, null, 1)}\n`);
  process.stdout.write(
    `${JSON.stringify(manifest.counts)}\nbaselineSetDigest ${manifest.baselineSetDigest}\n`,
  );
}

await main();

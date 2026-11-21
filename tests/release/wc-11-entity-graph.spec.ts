/**
 * WC-11 Entity graph 5.0.1 from npm, and notes still work
 * (features/wc-11-entity-graph.feature). Command scenario plus one browser flow.
 *
 * Pins: pure checks over the committed pnpm-lock.yaml and tooling/versions.toml
 * (src/entity-graph-pins.ts). The boundary packet also records `pnpm why
 * @prometheus-ags/entity-graph-core` in apps/web and both spikes, and `pnpm
 * lint:pins` (its own negative control: it fails on a 4.x or 5.0.0 pin).
 *
 * Notes: the existing create-and-list flow, in the DEFAULT build, because the
 * hosted build excludes /notes (WR-5). The /api/notes BFF is the one stubbed
 * boundary (in-memory); the entity graph, store and UI are the real ones.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  ENTITY_GRAPH_LOCK_TARGETS,
  ENTITY_GRAPH_PACKAGES,
  lockfileProblems,
  versionsTomlProblems,
} from "./src/entity-graph-pins.ts";
import { attachJson, attachScreenshot } from "./src/evidence.ts";
import { defaultBuildUrl, repoRoot } from "./src/release-env.ts";

/** A minimal pnpm lockfile with the web importer pinned to `version`, for the control. */
function syntheticLock(version: string): string {
  const lines = ["lockfileVersion: '9.0'", "", "importers:", ""];
  for (const importer of ["apps/web"]) {
    lines.push(`  ${importer}:`, "    dependencies:");
    for (const name of ENTITY_GRAPH_PACKAGES) {
      lines.push(
        `      '${name}':`,
        `        specifier: ${version}`,
        `        version: ${version}(react@19.2.7)`,
      );
    }
    lines.push("");
  }
  lines.push("packages:", "");
  for (const name of ENTITY_GRAPH_PACKAGES) {
    lines.push(`  '${name}@${version}':`, "    resolution: {integrity: sha512-AAAA}", "");
  }
  return lines.join("\n");
}

test.describe("WC-11 Entity graph 5.0.1 from npm, and notes still work", () => {
  test(
    "the lockfile and versions.toml pin 5.0.1 with npm integrity hashes in all three packages",
    { tag: ["@WC-11", "@value-critical", "@smoke"] },
    async ({ baseURL }, testInfo) => {
      const root = repoRoot();
      const toml = readFileSync(join(root, "tooling/versions.toml"), "utf8");
      const lockProblems = ENTITY_GRAPH_LOCK_TARGETS.flatMap((target) =>
        lockfileProblems(
          readFileSync(join(root, target.lockfile), "utf8"),
          target.importer,
          target.packages,
        ).map((problem) => `${target.lockfile}: ${problem}`),
      );
      const problems = [...lockProblems, ...versionsTomlProblems(toml)];
      await attachJson(testInfo, "wc-11-pin-problems.json", { baseURL, problems });
      expect(problems, "entity graph pin problems").toEqual([]);
    },
  );

  test("the pin checks fail for 4.3.0 and 5.0.0 and pass for 5.0.1 on the same synthetic lockfile", {
    tag: ["@WC-11", "@negative-control"],
  }, async () => {
    expect(lockfileProblems(syntheticLock("5.0.1")), "5.0.1 passes").toEqual([]);
    expect(lockfileProblems(syntheticLock("5.0.0")).length, "5.0.0 is flagged").toBeGreaterThan(0);
    expect(lockfileProblems(syntheticLock("4.3.0")).length, "4.3.0 is flagged").toBeGreaterThan(0);
    expect(
      versionsTomlProblems('entity_graph = "4.3.0"').length,
      "toml 4.3.0 is flagged",
    ).toBeGreaterThan(0);
    expect(versionsTomlProblems('entity_graph = "5.0.1"'), "toml 5.0.1 passes").toEqual([]);
    expect(
      versionsTomlProblems('entity_graph = "5.0.1"\nprometheus_entity_management = "4.2.0"'),
      "the separate entity-management pin is not an entity graph pin",
    ).toEqual([]);
  });

  test(
    "a note can be created and appears in the saved list",
    { tag: ["@WC-11", "@value-critical", "@packaged-only"] },
    async ({ browser }, testInfo) => {
      const context = await browser.newContext({ baseURL: defaultBuildUrl() });
      const page = await context.newPage();
      const store: { id: string; title: string }[] = [];
      await page.route("**/api/notes", async (route) => {
        const request = route.request();
        if (request.method() === "POST") {
          const body = request.postDataJSON() as { title: string };
          const note = { id: `note-${store.length + 1}`, title: body.title };
          store.push(note);
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify(note),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(store),
          });
        }
      });
      try {
        const title = `km-note-${Date.now().toString(36)}`;
        await page.goto("/notes");
        await expect(page.getByTestId("saved-notes")).toBeVisible();
        await page.getByTestId("note-input").fill(title);
        await page.getByTestId("save-note").click();
        await expect(
          page.getByTestId("saved-notes").getByText(title),
          "created note is listed",
        ).toBeVisible();
        await attachScreenshot(testInfo, page, "wc-11-notes");
      } finally {
        await context.close();
      }
    },
  );
});

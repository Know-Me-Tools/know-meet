/**
 * WR-2 Deep links and reloads return the app (features/wr-2-deep-links.feature).
 * Runs in both projects. The app document is identified by equality with the
 * body served for "/" plus the React mount point, so a generic 200 page from a
 * proxy cannot pass.
 */
import { expect, test } from "@playwright/test";
import { attachJson } from "./src/evidence.ts";
import { SCREEN } from "./src/test-ids.ts";

const ROUTES: ReadonlyArray<{ path: string; screen: string }> = [
  { path: "/", screen: SCREEN.home },
  { path: "/join", screen: SCREEN.join },
  { path: "/meet", screen: SCREEN.meet },
];

const APP_MOUNT = '<div id="root"></div>';

test.describe("WR-2 Deep links and reloads return the app", () => {
  for (const route of ROUTES) {
    test(
      `the ${route.path} route returns the app document and survives a reload`,
      { tag: ["@WR-2", "@value-critical"] },
      async ({ page, request }, testInfo) => {
        const root = await request.get("/", { failOnStatusCode: false });
        expect(root.status(), "GET / status").toBe(200);
        const appDocument = await root.text();
        expect(appDocument, "the app document holds the React mount point").toContain(APP_MOUNT);

        const response = await request.get(route.path, { failOnStatusCode: false });
        const contentType = response.headers()["content-type"] ?? "";
        await attachJson(testInfo, `wr-2-${route.screen}.json`, {
          path: route.path,
          status: response.status(),
          contentType,
        });
        expect(response.status(), `GET ${route.path} status`).toBe(200);
        expect(contentType, `GET ${route.path} content type`).toMatch(/^text\/html/);
        expect(await response.text(), `GET ${route.path} body is the app document`).toBe(
          appDocument,
        );

        await page.goto(route.path);
        await expect(page.getByTestId(route.screen), "rendered before reload").toBeVisible();
        await page.reload();
        await expect(page.getByTestId(route.screen), "rendered after reload").toBeVisible();
        expect(new URL(page.url()).pathname, "path kept across the reload").toBe(route.path);
      },
    );
  }

  test(
    "a missing asset is a 404, not the app document",
    { tag: ["@WR-2", "@negative-control"] },
    async ({ request }, testInfo) => {
      const response = await request.get("/assets/does-not-exist.js", {
        failOnStatusCode: false,
      });
      const body = await response.text();
      await attachJson(testInfo, "wr-2-missing-asset.json", {
        status: response.status(),
        contentType: response.headers()["content-type"] ?? "",
      });
      expect(response.status(), "GET /assets/does-not-exist.js status").toBe(404);
      expect(body, "the 404 body is not the app document").not.toContain(APP_MOUNT);
    },
  );
});

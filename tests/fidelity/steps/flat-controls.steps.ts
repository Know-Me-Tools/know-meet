import { expect, type Page } from "@playwright/test";
import {
	auditFlatControls,
	type FlatReport,
} from "../src/a11y/flat-controls-probe.ts";
import {
	contextOptions,
	prepareContext,
} from "../src/support/capture-environment.ts";
import type { Theme } from "../src/support/inventory.ts";
import { renderCell } from "../src/support/render-cell.ts";
import { Given, inScopeIdsOf, Then, When } from "./fixtures.ts";

const THEMES: readonly Theme[] = ["dark", "light"];
const VIEWPORTS: readonly number[] = [375, 768, 1024, 1440];

interface CellReport {
	readonly cell: string;
	readonly report: FlatReport;
}

const reports = new WeakMap<object, CellReport[]>();
const negativePages = new WeakMap<object, Page>();
const negativeReports = new WeakMap<object, FlatReport>();

When(
	"every interactive control of page {string} is audited in each theme at each viewport",
	async ({ browser, inventory, appTarget, scenario }, pageName: string) => {
		const collected: CellReport[] = [];
		for (const entry of inScopeIdsOf(inventory, pageName)) {
			for (const theme of THEMES) {
				for (const viewport of VIEWPORTS) {
					const cell = await renderCell(
						browser,
						appTarget,
						entry,
						theme,
						viewport,
					);
					if (cell === null) continue;
					try {
						collected.push({
							cell: `${entry.id}/${theme}/${viewport}`,
							report: await auditFlatControls(cell.page),
						});
					} finally {
						await cell.context.close();
					}
				}
			}
		}
		expect(
			collected.length,
			`states audited for page ${pageName}`,
		).toBeGreaterThan(0);
		reports.set(scenario, collected);
	},
);

Then(
	"no control has a non-zero border or outline width",
	async ({ scenario }) => {
		const offenders = (reports.get(scenario) ?? []).flatMap(
			({ cell, report }) =>
				report.problems
					.filter((p) => /border|outline|ring/.test(p) && !p.includes(":1"))
					.map((p) => `${cell}: ${p}`),
		);
		expect(offenders).toEqual([]);
	},
);

Then(
	"keyboard focus changes the control fill by at least 3:1 against its unfocused fill and the surface",
	async ({ scenario }) => {
		const cells = reports.get(scenario) ?? [];
		expect(
			cells.reduce((sum, c) => sum + c.report.focusStops, 0),
			"focus stops observed",
		).toBeGreaterThan(0);
		const offenders = cells.flatMap(({ cell, report }) =>
			report.problems
				.filter((p) => p.includes(":1"))
				.map((p) => `${cell}: ${p}`),
		);
		expect(offenders).toEqual([]);
	},
);

Then(
	"the flat-control results are recorded as evidence",
	async ({ scenario, $testInfo }) => {
		await $testInfo.attach("flat-controls.json", {
			body: JSON.stringify(reports.get(scenario) ?? [], null, 2),
			contentType: "application/json",
		});
	},
);

Given(
	"the home route is rendered in the dark theme at {int} for the flat-control audit",
	async ({ browser, baseURL, scenario }, viewport: number) => {
		const context = await browser.newContext(contextOptions(viewport));
		scenario.cleanups.push(() => context.close());
		const origin = baseURL ?? "";
		await prepareContext(context, {
			theme: "dark",
			access: "guest",
			allowedOrigin: new URL(origin).origin,
			blocked: [],
		});
		const page = await context.newPage();
		await page.goto(`${origin}/`);
		await page.waitForLoadState("networkidle");
		negativePages.set(scenario, page);
	},
);

When(
	"a 1px border on buttons and a 2px outline on focused controls are injected",
	async ({ scenario }) => {
		const page = negativePages.get(scenario);
		if (page === undefined) throw new Error("home route not rendered");
		await page.addStyleTag({
			content:
				"a,button{border:1px solid #fff !important}:focus-visible{outline:2px solid #fff !important}",
		});
		negativeReports.set(scenario, await auditFlatControls(page));
	},
);

Then(
	"the flat-control audit reports a border and an outline",
	async ({ scenario }) => {
		const problems = negativeReports.get(scenario)?.problems ?? [];
		expect(
			problems.some((p) => p.startsWith("rest") && p.includes("border")),
		).toBe(true);
		expect(
			problems.some((p) => p.startsWith("focus") && p.includes("outline")),
		).toBe(true);
	},
);

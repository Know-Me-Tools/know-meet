import { type Browser, expect, type Page } from "@playwright/test";
import {
	checkReducedMotion,
	checkTransitionTokens,
	type ProbeResult,
} from "../src/motion/motion-probe.ts";
import {
	checkInstant,
	checkMorphTokens,
	type MorphObservation,
	observeResize,
} from "../src/motion/nav-morph-probe.ts";
import { contextOptions } from "../src/support/capture-environment.ts";
import { tokenValue } from "../src/support/oracle.ts";
import { TOKENS_JSON } from "../src/support/repo-paths.ts";
import { Given, type ScenarioState, Then, When } from "./fixtures.ts";

const pages = new WeakMap<ScenarioState, Page>();
const observations = new WeakMap<ScenarioState, MorphObservation>();
const VIEWPORT_HEIGHT = 900;
const BODY_THEME_PROPERTIES = ["background-color", "color"];

function pageOf(scenario: ScenarioState): Page {
	const page = pages.get(scenario);
	if (page === undefined)
		throw new Error("The home route was not opened in this scenario");
	return page;
}

async function openHome(
	scenario: ScenarioState,
	browser: Browser,
	baseURL: string | undefined,
	width: number,
	reduce: boolean,
): Promise<void> {
	const context = await browser.newContext({
		...contextOptions(width),
		reducedMotion: reduce ? "reduce" : "no-preference",
	});
	scenario.cleanups.push(() => context.close());
	const page = await context.newPage();
	await page.goto(`${baseURL ?? ""}/`);
	await page.waitForLoadState("networkidle");
	pages.set(scenario, page);
}

async function record(
	attach: (
		n: string,
		o: { body: string; contentType: string },
	) => Promise<void>,
	name: string,
	result: ProbeResult,
): Promise<void> {
	await attach(name, {
		body: JSON.stringify(result, null, 2),
		contentType: "application/json",
	});
}

Given("the motion tokens are read from {string}", async ({}, path: string) => {
	expect(path).toBe("docs/design/tokens.json");
	for (const token of [
		"dur",
		"ease-standard",
		"ease-out",
		"dur-reduced-motion",
	])
		expect(tokenValue(token, "dark", TOKENS_JSON)).not.toBe("");
});

When(
	"the home route is opened with no motion preference",
	async ({ scenario, browser, baseURL }) => {
		await openHome(scenario, browser, baseURL, 1440, false);
	},
);

When(
	"the home route is opened at {int} with no motion preference",
	async ({ scenario, browser, baseURL }, width: number) => {
		await openHome(scenario, browser, baseURL, width, false);
	},
);

When(
	"the home route is opened with prefers-reduced-motion set to reduce",
	async ({ scenario, browser, baseURL }) => {
		await openHome(scenario, browser, baseURL, 1440, true);
	},
);

When(
	"the home route is opened at {int} with prefers-reduced-motion set to reduce",
	async ({ scenario, browser, baseURL }, width: number) => {
		await openHome(scenario, browser, baseURL, width, true);
	},
);

When(
	"the viewport is resized to {int}",
	async ({ scenario, appStateMap }, width: number) => {
		observations.set(
			scenario,
			await observeResize(
				pageOf(scenario),
				appStateMap.roles.appnav,
				width,
				VIEWPORT_HEIGHT,
			),
		);
	},
);

When(
	"a style giving the navigation morph a 500ms duration is injected",
	async ({ scenario, appStateMap }) => {
		await pageOf(scenario).addStyleTag({
			content: `::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation-duration:500ms !important}${appStateMap.roles.appnav}{transition-duration:500ms !important}`,
		});
	},
);

When(
	"a style giving the page body a 300ms transition is injected",
	async ({ scenario }) => {
		await pageOf(scenario).addStyleTag({
			content: "body{transition-duration:300ms !important}",
		});
	},
);

Then(
	"the page body transitions background-color and color over token {string} with easing token {string}",
	async ({ scenario, $testInfo }, dur: string, ease: string) => {
		const result = await checkTransitionTokens(
			pageOf(scenario).locator("body"),
			BODY_THEME_PROPERTIES,
			dur,
			ease,
		);
		await record(
			(n, o) => $testInfo.attach(n, o),
			"body-transition.json",
			result,
		);
		expect(result.ok, result.detail).toBe(true);
	},
);

function observationOf(scenario: ScenarioState): MorphObservation {
	const observation = observations.get(scenario);
	if (observation === undefined)
		throw new Error("The viewport was not resized in this scenario");
	return observation;
}

Then(
	"the crossing animates over token {string} with easing token {string} into the {string} navigation using only transform and opacity",
	async (
		{ scenario, $testInfo },
		dur: string,
		ease: string,
		navClass: string,
	) => {
		const result = checkMorphTokens(
			observationOf(scenario),
			navClass,
			dur,
			ease,
		);
		await record((n, o) => $testInfo.attach(n, o), "nav-morph.json", result);
		expect(result.ok, result.detail).toBe(true);
	},
);

Then(
	"the {string} navigation is shown with no animation",
	async ({ scenario }, navClass: string) => {
		const result = checkInstant(observationOf(scenario), navClass);
		expect(result.ok, result.detail).toBe(true);
	},
);

Then(
	"the instant-morph check fails for the {string} navigation",
	async ({ scenario }, navClass: string) => {
		const result = checkInstant(observationOf(scenario), navClass);
		expect(
			result.ok,
			"the instant check must not pass when the morph animates",
		).toBe(false);
	},
);

Then(
	"the nav-token check fails for the {string} navigation",
	async ({ scenario }, navClass: string) => {
		const result = checkMorphTokens(
			observationOf(scenario),
			navClass,
			"dur-nav-morph",
			"ease-layout",
		);
		expect(result.ok, "a 500ms morph must fail the nav-token check").toBe(
			false,
		);
	},
);

Then(
	"every transition and animation duration on the page is at most token {string}",
	async ({ scenario, $testInfo }, token: string) => {
		expect(token).toBe("dur-reduced-motion");
		const result = await checkReducedMotion(pageOf(scenario));
		await record(
			(n, o) => $testInfo.attach(n, o),
			"reduced-motion.json",
			result,
		);
		expect(result.ok, result.detail).toBe(true);
	},
);

Then("no dot animation is running", async ({ scenario }) => {
	const running = await pageOf(scenario).evaluate(
		() =>
			document.getAnimations().filter((a) => a.playState === "running").length,
	);
	expect(running).toBe(0);
});

Then(
	"the reduced-motion duration check fails for the page body",
	async ({ scenario }) => {
		const result = await checkReducedMotion(pageOf(scenario), "body");
		expect(
			result.ok,
			"the reduced-motion check must not pass without the media emulation",
		).toBe(false);
	},
);

Then(
	"the tokenized-duration check fails for the page body",
	async ({ scenario }) => {
		const result = await checkTransitionTokens(
			pageOf(scenario).locator("body"),
			BODY_THEME_PROPERTIES,
			"dur",
			"ease-standard",
		);
		expect(
			result.ok,
			"an off-token 300ms duration must fail the token check",
		).toBe(false);
	},
);

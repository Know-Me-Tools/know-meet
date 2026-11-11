import type { Page } from "@playwright/test";

/** Flat 2.0 (DESIGN.md, operator decision D-6): fills carry boundary and focus, never strokes. */
export const MIN_FILL_CONTRAST = 3;
const MAX_TAB_STOPS = 40;

export interface ControlRest {
	readonly id: number;
	readonly label: string;
	readonly strokes: readonly string[];
	readonly fill: string;
}

export interface FocusStop {
	readonly id: number;
	readonly label: string;
	readonly strokes: readonly string[];
	readonly contrastToRest: number;
	readonly contrastToSurface: number;
}

export interface FlatReport {
	readonly controls: number;
	readonly focusStops: number;
	readonly problems: readonly string[];
}

const INTERACTIVE =
	'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"]), ' +
	'[role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [role="menuitem"], [role="link"]';

/** Rest pass: tags each visible control with an id and reports strokes and its effective fill. */
async function readRest(page: Page): Promise<ControlRest[]> {
	return page.evaluate((selector) => {
		const strokes = (style: CSSStyleDeclaration): string[] => {
			const out: string[] = [];
			for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
				const width = Number.parseFloat(style[`border${side}Width`]);
				if (width > 0 && style[`border${side}Style`] !== "none")
					out.push(`border-${side.toLowerCase()} ${width}px`);
			}
			if (
				Number.parseFloat(style.outlineWidth) > 0 &&
				style.outlineStyle !== "none"
			)
				out.push(`outline ${style.outlineWidth}`);
			// A ring is a zero-blur box-shadow with spread (Tailwind ring-*); soft elevation is allowed.
			for (const shadow of style.boxShadow.split(/,(?![^(]*\))/)) {
				const numbers = shadow.match(/-?\d+(\.\d+)?px/g) ?? [];
				if (
					numbers.length >= 4 &&
					Number.parseFloat(numbers[2] ?? "0") === 0 &&
					Number.parseFloat(numbers[3] ?? "0") !== 0
				)
					out.push(`ring ${shadow.trim()}`);
			}
			return out;
		};
		const toRgba = (value: string): number[] => {
			const canvas = document.createElement("canvas");
			canvas.width = canvas.height = 1;
			const ctx = canvas.getContext("2d", { willReadFrequently: true });
			if (ctx === null) return [0, 0, 0, 0];
			ctx.clearRect(0, 0, 1, 1);
			ctx.fillStyle = value;
			ctx.fillRect(0, 0, 1, 1);
			return Array.from(ctx.getImageData(0, 0, 1, 1).data);
		};
		const fillOf = (element: Element): string => {
			for (
				let node: Element | null = element;
				node !== null;
				node = node.parentElement
			) {
				const color = getComputedStyle(node).backgroundColor;
				if ((toRgba(color)[3] ?? 0) > 0) return color;
			}
			return "rgb(0, 0, 0)";
		};
		const out: Array<{
			id: number;
			label: string;
			strokes: string[];
			fill: string;
		}> = [];
		let id = 0;
		for (const element of Array.from(
			document.querySelectorAll<HTMLElement>(selector),
		)) {
			const box = element.getBoundingClientRect();
			const style = getComputedStyle(element);
			if (box.width === 0 || box.height === 0 || style.visibility === "hidden")
				continue;
			id += 1;
			element.setAttribute("data-km-flat-id", String(id));
			out.push({
				id,
				label: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}[${(element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 30)}]`,
				strokes: strokes(style),
				fill: fillOf(element),
			});
		}
		return out;
	}, INTERACTIVE);
}

/** Focus pass: for the element holding keyboard focus, strokes and fill contrast. */
async function readFocus(
	page: Page,
	rest: ReadonlyMap<number, ControlRest>,
): Promise<FocusStop | null> {
	const stop = await page.evaluate(() => {
		const el = document.activeElement as HTMLElement | null;
		const id = Number(el?.getAttribute("data-km-flat-id") ?? "0");
		if (el === null || id === 0 || !el.matches(":focus-visible")) return null;
		const toRgba = (value: string): number[] => {
			const canvas = document.createElement("canvas");
			canvas.width = canvas.height = 1;
			const ctx = canvas.getContext("2d", { willReadFrequently: true });
			if (ctx === null) return [0, 0, 0, 0];
			ctx.clearRect(0, 0, 1, 1);
			ctx.fillStyle = value;
			ctx.fillRect(0, 0, 1, 1);
			return Array.from(ctx.getImageData(0, 0, 1, 1).data);
		};
		const fillOf = (node: Element | null): string => {
			for (let n = node; n !== null; n = n.parentElement) {
				const color = getComputedStyle(n).backgroundColor;
				if ((toRgba(color)[3] ?? 0) > 0) return color;
			}
			return "rgb(0, 0, 0)";
		};
		const style = getComputedStyle(el);
		const strokes: string[] = [];
		if (
			Number.parseFloat(style.outlineWidth) > 0 &&
			style.outlineStyle !== "none"
		)
			strokes.push(`outline ${style.outlineWidth} ${style.outlineStyle}`);
		for (const side of ["Top", "Right", "Bottom", "Left"] as const)
			if (
				Number.parseFloat(style[`border${side}Width`]) > 0 &&
				style[`border${side}Style`] !== "none"
			)
				strokes.push(`border-${side.toLowerCase()}`);
		return { id, strokes, fill: fillOf(el), surface: fillOf(el.parentElement) };
	});
	if (stop === null) return null;
	const before = rest.get(stop.id);
	if (before === undefined) return null;
	const [contrastToRest, contrastToSurface] = await page.evaluate(
		({ a, b, c }) => {
			const toRgba = (value: string): number[] => {
				const canvas = document.createElement("canvas");
				canvas.width = canvas.height = 1;
				const ctx = canvas.getContext("2d", { willReadFrequently: true });
				if (ctx === null) return [0, 0, 0, 0];
				ctx.fillStyle = value;
				ctx.fillRect(0, 0, 1, 1);
				return Array.from(ctx.getImageData(0, 0, 1, 1).data);
			};
			const lum = (value: string): number => {
				const [r = 0, g = 0, bl = 0] = toRgba(value).map((v) => {
					const s = v / 255;
					return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
				});
				return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
			};
			const ratio = (x: string, y: string): number => {
				const [hi, lo] = [lum(x), lum(y)].sort((m, n) => n - m) as [
					number,
					number,
				];
				return (hi + 0.05) / (lo + 0.05);
			};
			return [ratio(a, b), ratio(a, c)] as const;
		},
		{ a: stop.fill, b: before.fill, c: stop.surface },
	);
	return {
		id: stop.id,
		label: before.label,
		strokes: stop.strokes,
		contrastToRest,
		contrastToSurface,
	};
}

/** Rest and keyboard-focus audit of every interactive control currently rendered. */
export async function auditFlatControls(page: Page): Promise<FlatReport> {
	const rest = await readRest(page);
	const byId = new Map(rest.map((control) => [control.id, control]));
	const problems = rest
		.filter((control) => control.strokes.length > 0)
		.map((control) => `rest ${control.label}: ${control.strokes.join(", ")}`);
	await page.evaluate(() =>
		(document.activeElement as HTMLElement | null)?.blur(),
	);
	let stops = 0;
	for (let index = 0; index < MAX_TAB_STOPS; index += 1) {
		await page.keyboard.press("Tab");
		const stop = await readFocus(page, byId);
		if (stop === null) continue;
		stops += 1;
		if (stop.strokes.length > 0)
			problems.push(`focus ${stop.label}: ${stop.strokes.join(", ")}`);
		if (stop.contrastToRest < MIN_FILL_CONTRAST)
			problems.push(
				`focus ${stop.label}: fill changes by only ${stop.contrastToRest.toFixed(2)}:1`,
			);
		if (stop.contrastToSurface < MIN_FILL_CONTRAST)
			problems.push(
				`focus ${stop.label}: ${stop.contrastToSurface.toFixed(2)}:1 against surface`,
			);
	}
	return { controls: rest.length, focusStops: stops, problems };
}

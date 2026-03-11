import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
	createScrollObserver,
	fadeInUp,
	scaleIn,
	slideInLeft,
	slideInRight,
} from "../lib/utils/animations.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const featuresDir = path.join(__dirname, "features");

function parseFeature(text) {
	const lines = text.split(/\r?\n/);

	let featureName = null;
	const scenarios = [];
	let currentScenario = null;

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;

		{
			const match = line.match(/^Feature:\s*(.+)$/);
			if (match) {
				featureName = match[1].trim();
				continue;
			}
		}

		{
			const match = line.match(/^Scenario:\s*(.+)$/);
			if (match) {
				currentScenario = { name: match[1].trim(), steps: [] };
				scenarios.push(currentScenario);
				continue;
			}
		}

		{
			const match = line.match(/^(Given|When|Then|And|But)\s+(.+)$/);
			if (match) {
				if (!currentScenario) {
					throw new Error(`Step found before a Scenario: "${line}"`);
				}
				currentScenario.steps.push(`${match[1]} ${match[2].trim()}`);
			}
		}
	}

	if (!featureName) {
		throw new Error("Missing Feature name");
	}

	return { name: featureName, scenarios };
}

function extractNumber(css, re) {
	const match = css.match(re);
	if (!match) return null;
	return Number(match[1]);
}

function defineStep(steps, pattern, handler) {
	steps.push({ pattern, handler });
}

function resolveStep(steps, stepLine) {
	for (const step of steps) {
		const match = stepLine.match(step.pattern);
		if (match) return { handler: step.handler, args: match.slice(1) };
	}
	throw new Error(`No step definition found for: "${stepLine}"`);
}

function buildSteps() {
	const steps = [];

	defineStep(
		steps,
		/^(?:Given|And) a "(fadeInUp|slideInLeft|slideInRight|scaleIn)" transition with default options$/,
		(world, transitionName) => {
			const transitions = {
				fadeInUp,
				slideInLeft,
				slideInRight,
				scaleIn,
			};
			const transitionFactory = transitions[transitionName];
			if (!transitionFactory) {
				throw new Error(`Unknown transition: ${transitionName}`);
			}
			world.transition = transitionFactory({}, undefined);
		},
	);

	defineStep(
		steps,
		/^(?:Given|And) a "(slideInLeft|slideInRight)" transition with delay (\d+) and duration (\d+)$/,
		(world, transitionName, delay, duration) => {
			const transitions = { slideInLeft, slideInRight };
			const transitionFactory = transitions[transitionName];
			if (!transitionFactory) {
				throw new Error(`Unknown transition: ${transitionName}`);
			}

			const transition = transitionFactory(
				{},
				{ delay: Number(delay), duration: Number(duration) },
			);
			if (transitionName === "slideInLeft") world.left = transition;
			if (transitionName === "slideInRight") world.right = transition;
		},
	);

	defineStep(
		steps,
		/^When I render css at t=([0-9]+(?:\.[0-9]+)?)$/,
		(world, t) => {
			if (!world.transition) throw new Error("No transition set");
			world.css = world.transition.css(Number(t));
		},
	);

	defineStep(
		steps,
		/^When I render left css at t=([0-9]+(?:\.[0-9]+)?)$/,
		(world, t) => {
			if (!world.left) throw new Error("No left transition set");
			world.leftCss = world.left.css(Number(t));
		},
	);

	defineStep(
		steps,
		/^When I render right css at t=([0-9]+(?:\.[0-9]+)?)$/,
		(world, t) => {
			if (!world.right) throw new Error("No right transition set");
			world.rightCss = world.right.css(Number(t));
		},
	);

	defineStep(
		steps,
		/^Then translateY is (-?[0-9]+(?:\.[0-9]+)?) and opacity is (-?[0-9]+(?:\.[0-9]+)?)$/,
		(world, y, opacity) => {
			const translateY = extractNumber(
				world.css,
				/translateY\(([-0-9.eE]+)px\)/,
			);
			const actualOpacity = extractNumber(
				world.css,
				/opacity:\s*([-0-9.eE]+)\s*;/,
			);
			expect(translateY).toBeCloseTo(Number(y), 10);
			expect(actualOpacity).toBeCloseTo(Number(opacity), 10);
		},
	);

	defineStep(
		steps,
		/^Then left translateX is (-?[0-9]+(?:\.[0-9]+)?) and opacity is (-?[0-9]+(?:\.[0-9]+)?)$/,
		(world, x, opacity) => {
			const translateX = extractNumber(
				world.leftCss,
				/translateX\(([-0-9.eE]+)px\)/,
			);
			const actualOpacity = extractNumber(
				world.leftCss,
				/opacity:\s*([-0-9.eE]+)\s*;/,
			);
			expect(translateX).toBeCloseTo(Number(x), 10);
			expect(actualOpacity).toBeCloseTo(Number(opacity), 10);
		},
	);

	defineStep(
		steps,
		/^Then right translateX is (-?[0-9]+(?:\.[0-9]+)?) and opacity is (-?[0-9]+(?:\.[0-9]+)?)$/,
		(world, x, opacity) => {
			const translateX = extractNumber(
				world.rightCss,
				/translateX\(([-0-9.eE]+)px\)/,
			);
			const actualOpacity = extractNumber(
				world.rightCss,
				/opacity:\s*([-0-9.eE]+)\s*;/,
			);
			expect(translateX).toBeCloseTo(Number(x), 10);
			expect(actualOpacity).toBeCloseTo(Number(opacity), 10);
		},
	);

	defineStep(steps, /^Given a scroll observer callback$/, (world) => {
		world.observerCallback = vi.fn();
	});

	defineStep(
		steps,
		/^When I create a scroll observer with threshold ([0-9]+(?:\.[0-9]+)?) and rootMargin "([^"]+)"$/,
		(world, threshold, rootMargin) => {
			const OriginalIntersectionObserver = globalThis.IntersectionObserver;

			class MockIntersectionObserver {
				constructor(callback, options) {
					this.callback = callback;
					this.options = options;
				}
			}

			globalThis.IntersectionObserver = MockIntersectionObserver;
			world.cleanups.push(() => {
				globalThis.IntersectionObserver = OriginalIntersectionObserver;
			});

			world.observer = createScrollObserver(world.observerCallback, {
				threshold: Number(threshold),
				rootMargin,
			});
		},
	);

	defineStep(
		steps,
		/^When I create a scroll observer with default options$/,
		(world) => {
			const OriginalIntersectionObserver = globalThis.IntersectionObserver;

			class MockIntersectionObserver {
				constructor(callback, options) {
					this.callback = callback;
					this.options = options;
				}
			}

			globalThis.IntersectionObserver = MockIntersectionObserver;
			world.cleanups.push(() => {
				globalThis.IntersectionObserver = OriginalIntersectionObserver;
			});

			world.observer = createScrollObserver(world.observerCallback);
		},
	);

	defineStep(
		steps,
		/^Then observer options equal threshold ([0-9]+(?:\.[0-9]+)?) and rootMargin "([^"]+)"$/,
		(world, threshold, rootMargin) => {
			expect(world.observer.options).toEqual({
				threshold: Number(threshold),
				rootMargin,
			});
		},
	);

	defineStep(steps, /^Given I am running on the server$/, (world) => {
		world.runtime = { browser: false };
	});

	defineStep(
		steps,
		/^Given I am running in the browser with navigator language "([^"]+)"$/,
		(world, language) => {
			world.runtime = { browser: true, language };
		},
	);

	defineStep(steps, /^When i18n initializes$/, async (world) => {
		vi.resetModules();

		if (world.runtime.browser) {
			Object.defineProperty(window.navigator, "language", {
				value: world.runtime.language,
				configurable: true,
			});
		}

		vi.doMock("$app/environment", () => ({
			browser: Boolean(world.runtime.browser),
		}));

		world.i18nInit = vi.fn();
		world.i18nRegister = vi.fn();
		vi.doMock("svelte-i18n", () => ({
			_: undefined,
			init: world.i18nInit,
			isLoading: undefined,
			locale: undefined,
			register: world.i18nRegister,
			waitLocale: undefined,
		}));

		await import("../lib/i18n/index.js");
	});

	defineStep(steps, /^Then initial locale is "([^"]+)"$/, (world, locale) => {
		const normalized = String(locale).toLowerCase().split("-")[0] ?? "";
		const expected = ["ko", "en"].includes(normalized) ? normalized : "ko";

		expect(world.i18nInit).toHaveBeenCalledWith({
			fallbackLocale: "ko",
			initialLocale: expected,
		});
	});

	defineStep(
		steps,
		/^And both "ko" and "en" locale loaders resolve$/,
		async (world) => {
			expect(world.i18nRegister).toHaveBeenCalledTimes(2);

			const [, koLoader] = world.i18nRegister.mock.calls.find(
				([key]) => key === "ko",
			);
			const ko = await koLoader();
			expect(ko).toBeTruthy();

			const [, enLoader] = world.i18nRegister.mock.calls.find(
				([key]) => key === "en",
			);
			const en = await enLoader();
			expect(en).toBeTruthy();
		},
	);

	return steps;
}

describe("BDD (Gherkin)", () => {
	if (!fs.existsSync(featuresDir)) {
		throw new Error(`Missing features directory: ${featuresDir}`);
	}

	const featureFiles = fs
		.readdirSync(featuresDir, { withFileTypes: true })
		.filter((d) => d.isFile())
		.map((d) => d.name)
		.filter((name) => name.endsWith(".feature"))
		.sort();

	if (featureFiles.length === 0) {
		throw new Error("No .feature files found");
	}

	const steps = buildSteps();

	for (const fileName of featureFiles) {
		const filePath = path.join(featuresDir, fileName);
		const feature = parseFeature(fs.readFileSync(filePath, "utf8"));

		describe(feature.name, () => {
			for (const scenario of feature.scenarios) {
				it(scenario.name, async () => {
					const world = { cleanups: [] };
					try {
						for (const stepLine of scenario.steps) {
							const { handler, args } = resolveStep(steps, stepLine);
							await handler(world, ...args);
						}
					} finally {
						for (const cleanup of world.cleanups.slice().reverse()) cleanup();
					}
				});
			}
		});
	}
});

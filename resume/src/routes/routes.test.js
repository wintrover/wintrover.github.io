import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { describe, expect, it, vi } from "vitest";

var currentBrowser = false;
var currentBase = "";
var waitLocaleImpl = () => Promise.resolve();

vi.mock("$app/environment", () => ({
	get browser() {
		return currentBrowser;
	},
}));

vi.mock("$app/paths", () => ({
	get base() {
		return currentBase;
	},
}));

vi.mock("svelte-i18n", async () => {
	const { writable } = await import("svelte/store");
	const locale = writable("ko");
	const isLoading = writable(false);
	const _ = writable((key) => key);

	return {
		_,
		init: () => {},
		isLoading,
		locale,
		register: () => {},
		waitLocale: (...args) => waitLocaleImpl(...args),
	};
});

import { load as layoutLoad } from "./+layout.js";
import Layout from "./+layout.svelte";
import Page from "./+page.svelte";

describe("routes", () => {
	it("renders page and sets document title", async () => {
		const { _ } = await import("svelte-i18n");
		_.set((key) => key);

		const { unmount } = render(Page);
		expect(document.title).toBe("meta.title");
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"site_title",
		);
		unmount();
	});

	it("updates document title when translations change", async () => {
		const { _ } = await import("svelte-i18n");
		_.set((key) => key);
		const { unmount } = render(Page);
		expect(document.title).toBe("meta.title");

		_.set((key) => `updated:${key}`);
		await tick();
		expect(document.title).toBe("updated:meta.title");

		_.set((key) => key);
		await tick();
		unmount();
	});

	it("clears document title when meta title is missing", async () => {
		const { _ } = await import("svelte-i18n");
		_.set((key) => (key === "meta.title" ? undefined : key));

		const { unmount } = render(Page);
		expect(document.head.querySelector("title")?.textContent ?? "").toBe("");
		unmount();

		_.set((key) => key);
	});

	it("layout shows spinner while loading", async () => {
		const { isLoading } = await import("svelte-i18n");
		const { _ } = await import("svelte-i18n");
		_.set((key) => key);
		isLoading.set(true);
		const { unmount } = render(Layout);
		expect(screen.getByText("loading_message")).toBeInTheDocument();
		unmount();
	});

	it("layout hides spinner when not loading", async () => {
		const { isLoading } = await import("svelte-i18n");
		const { _ } = await import("svelte-i18n");
		_.set((key) => key);
		isLoading.set(false);
		const { unmount } = render(Layout);
		expect(screen.queryByText("loading_message")).not.toBeInTheDocument();
		unmount();
	});

	it("layout load waits for locale on server", async () => {
		currentBrowser = false;
		waitLocaleImpl = vi.fn().mockResolvedValue(undefined);

		const { locale } = await import("svelte-i18n");
		const setSpy = vi.spyOn(locale, "set");

		await layoutLoad();

		expect(setSpy).not.toHaveBeenCalled();
		expect(waitLocaleImpl).toHaveBeenCalledTimes(1);
		setSpy.mockRestore();
	});

	it("layout load logs waitLocale failure on server", async () => {
		currentBrowser = false;
		const waitError = new Error("wait failed");
		waitLocaleImpl = vi.fn().mockRejectedValueOnce(waitError);

		const { locale } = await import("svelte-i18n");
		const setSpy = vi.spyOn(locale, "set");
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		await layoutLoad();

		expect(setSpy).not.toHaveBeenCalled();
		expect(errorSpy).toHaveBeenCalledWith(
			"[i18n] waitLocale failed",
			expect.objectContaining({
				href: undefined,
				language: undefined,
				error: waitError,
			}),
		);
		errorSpy.mockRestore();
		setSpy.mockRestore();
	});

	it("layout load sets locale from navigator on browser", async () => {
		currentBrowser = true;
		waitLocaleImpl = vi.fn().mockResolvedValue(undefined);

		Object.defineProperty(window.navigator, "language", {
			value: "en-US",
			configurable: true,
		});

		const { locale } = await import("svelte-i18n");
		const setSpy = vi.spyOn(locale, "set");

		await layoutLoad();

		expect(setSpy).toHaveBeenCalledWith("en");
		expect(waitLocaleImpl).toHaveBeenCalledTimes(1);
		setSpy.mockRestore();
	});

	it("layout load logs and falls back when locale.set fails", async () => {
		currentBrowser = true;
		waitLocaleImpl = vi.fn().mockResolvedValue(undefined);

		Object.defineProperty(window.navigator, "language", {
			value: "en-US",
			configurable: true,
		});

		const setError = new Error("set failed");
		const { locale } = await import("svelte-i18n");
		const originalSet = locale.set;
		const setSpy = vi
			.spyOn(locale, "set")
			.mockImplementationOnce(() => {
				throw setError;
			})
			.mockImplementation(originalSet);

		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		await layoutLoad();

		expect(errorSpy).toHaveBeenCalledWith(
			"[i18n] locale.set failed",
			expect.objectContaining({ language: "en-US", error: setError }),
		);
		expect(setSpy).toHaveBeenNthCalledWith(2, "ko");
		errorSpy.mockRestore();
		setSpy.mockRestore();
	});

	it("layout load retries when waitLocale fails", async () => {
		currentBrowser = true;

		Object.defineProperty(window.navigator, "language", {
			value: "en-US",
			configurable: true,
		});

		const waitError = new Error("wait failed");
		waitLocaleImpl = vi
			.fn()
			.mockRejectedValueOnce(waitError)
			.mockResolvedValueOnce(undefined);

		const { locale } = await import("svelte-i18n");
		const setSpy = vi.spyOn(locale, "set");

		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		await layoutLoad();

		expect(errorSpy).toHaveBeenCalledWith(
			"[i18n] waitLocale failed",
			expect.objectContaining({ language: "en-US", error: waitError }),
		);
		expect(setSpy).toHaveBeenCalledWith("en");
		expect(setSpy).toHaveBeenCalledWith("ko");
		expect(waitLocaleImpl).toHaveBeenCalledTimes(2);
		errorSpy.mockRestore();
		setSpy.mockRestore();
	});

	it("layout load logs when waitLocale fallback also fails", async () => {
		currentBrowser = true;

		Object.defineProperty(window.navigator, "language", {
			value: "en-US",
			configurable: true,
		});

		const waitError = new Error("wait failed");
		const fallbackWaitError = new Error("fallback wait failed");
		waitLocaleImpl = vi
			.fn()
			.mockRejectedValueOnce(waitError)
			.mockRejectedValueOnce(fallbackWaitError);

		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		await layoutLoad();

		expect(errorSpy).toHaveBeenCalledWith(
			"[i18n] waitLocale fallback failed",
			expect.objectContaining({ error: fallbackWaitError }),
		);
		expect(waitLocaleImpl).toHaveBeenCalledTimes(2);
		errorSpy.mockRestore();
	});
});

import { describe, expect, it, vi } from "vitest";

describe("i18n init", () => {
	it("uses default locale on server", async () => {
		vi.resetModules();

		vi.doMock("$app/environment", () => ({ browser: false }));
		vi.doMock("$env/static/public", () => ({ PUBLIC_DEFAULT_LOCALE: "ko" }));

		const init = vi.fn();
		const register = vi.fn();
		vi.doMock("svelte-i18n", () => ({
			_: undefined,
			init,
			isLoading: undefined,
			locale: undefined,
			register,
			waitLocale: undefined,
		}));

		await import("./index.js");

		expect(register).toHaveBeenCalledTimes(2);
		expect(register).toHaveBeenCalledWith("ko", expect.any(Function));
		expect(register).toHaveBeenCalledWith("en", expect.any(Function));
		expect(init).toHaveBeenCalledWith({
			fallbackLocale: "ko",
			initialLocale: "ko",
		});

		const [, koLoader] = register.mock.calls.find(([key]) => key === "ko");
		const ko = await koLoader();
		expect(ko).toBeTruthy();

		const [, enLoader] = register.mock.calls.find(([key]) => key === "en");
		const en = await enLoader();
		expect(en).toBeTruthy();
	});

	it("uses navigator language on browser", async () => {
		vi.resetModules();

		Object.defineProperty(window.navigator, "language", {
			value: "en-US",
			configurable: true,
		});

		vi.doMock("$app/environment", () => ({ browser: true }));
		vi.doMock("$env/static/public", () => ({ PUBLIC_DEFAULT_LOCALE: "ko" }));

		const init = vi.fn();
		const register = vi.fn();
		vi.doMock("svelte-i18n", () => ({
			_: undefined,
			init,
			isLoading: undefined,
			locale: undefined,
			register,
			waitLocale: undefined,
		}));

		await import("./index.js");

		expect(init).toHaveBeenCalledWith({
			fallbackLocale: "ko",
			initialLocale: "en",
		});
	});

	it("falls back to default locale for unsupported browser language", async () => {
		vi.resetModules();

		Object.defineProperty(window.navigator, "language", {
			value: "ja-JP",
			configurable: true,
		});

		vi.doMock("$app/environment", () => ({ browser: true }));
		vi.doMock("$env/static/public", () => ({ PUBLIC_DEFAULT_LOCALE: "ko" }));

		const init = vi.fn();
		const register = vi.fn();
		vi.doMock("svelte-i18n", () => ({
			_: undefined,
			init,
			isLoading: undefined,
			locale: undefined,
			register,
			waitLocale: undefined,
		}));

		await import("./index.js");

		expect(init).toHaveBeenCalledWith({
			fallbackLocale: "ko",
			initialLocale: "ko",
		});
	});

	it("falls back to default locale when navigator language is missing", async () => {
		vi.resetModules();

		Object.defineProperty(window.navigator, "language", {
			value: undefined,
			configurable: true,
		});

		vi.doMock("$app/environment", () => ({ browser: true }));
		vi.doMock("$env/static/public", () => ({ PUBLIC_DEFAULT_LOCALE: "ko" }));

		const init = vi.fn();
		const register = vi.fn();
		vi.doMock("svelte-i18n", () => ({
			_: undefined,
			init,
			isLoading: undefined,
			locale: undefined,
			register,
			waitLocale: undefined,
		}));

		await import("./index.js");

		expect(init).toHaveBeenCalledWith({
			fallbackLocale: "ko",
			initialLocale: "ko",
		});
	});

	it("logs and rethrows when a locale loader fails on browser", async () => {
		vi.resetModules();

		Object.defineProperty(window.navigator, "language", {
			value: "ko-KR",
			configurable: true,
		});

		vi.doMock("$app/environment", () => ({ browser: true }));
		vi.doMock("$env/static/public", () => ({ PUBLIC_DEFAULT_LOCALE: "ko" }));

		const init = vi.fn();
		const register = vi.fn();
		vi.doMock("svelte-i18n", () => ({
			_: undefined,
			init,
			isLoading: undefined,
			locale: undefined,
			register,
			waitLocale: undefined,
		}));

		vi.doMock("./locales/ko.json", () => {
			throw new Error("loader failed");
		});

		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		await import("./index.js");

		const [, koLoader] = register.mock.calls.find(([key]) => key === "ko");
		await expect(koLoader()).rejects.toMatchObject({
			cause: { message: "loader failed" },
		});
		expect(errorSpy).toHaveBeenCalledWith(
			"[i18n] locale loader failed",
			expect.objectContaining({
				locale: "ko",
				language: "ko-KR",
				error: expect.objectContaining({
					cause: expect.objectContaining({ message: "loader failed" }),
				}),
			}),
		);

		errorSpy.mockRestore();
	});

	it("logs and rethrows when a locale loader fails on server", async () => {
		vi.resetModules();

		vi.doMock("$app/environment", () => ({ browser: false }));
		vi.doMock("$env/static/public", () => ({ PUBLIC_DEFAULT_LOCALE: "ko" }));

		const init = vi.fn();
		const register = vi.fn();
		vi.doMock("svelte-i18n", () => ({
			_: undefined,
			init,
			isLoading: undefined,
			locale: undefined,
			register,
			waitLocale: undefined,
		}));

		vi.doMock("./locales/ko.json", () => {
			throw new Error("loader failed");
		});

		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		await import("./index.js");

		const [, koLoader] = register.mock.calls.find(([key]) => key === "ko");
		await expect(koLoader()).rejects.toMatchObject({
			cause: { message: "loader failed" },
		});
		expect(errorSpy).toHaveBeenCalledWith(
			"[i18n] locale loader failed",
			expect.objectContaining({
				locale: "ko",
				href: undefined,
				language: undefined,
				error: expect.objectContaining({
					cause: expect.objectContaining({ message: "loader failed" }),
				}),
			}),
		);

		errorSpy.mockRestore();
	});

	it("uses path locale over navigator language on browser", async () => {
		vi.resetModules();

		window.history.replaceState({}, "", "/en/resume/");

		Object.defineProperty(window.navigator, "language", {
			value: "ko-KR",
			configurable: true,
		});

		vi.doMock("$app/environment", () => ({ browser: true }));
		vi.doMock("$env/static/public", () => ({ PUBLIC_DEFAULT_LOCALE: "ko" }));

		const init = vi.fn();
		const register = vi.fn();
		vi.doMock("svelte-i18n", () => ({
			_: undefined,
			init,
			isLoading: undefined,
			locale: undefined,
			register,
			waitLocale: undefined,
		}));

		await import("./index.js");

		expect(init).toHaveBeenCalledWith({
			fallbackLocale: "ko",
			initialLocale: "en",
		});
	});

	it("uses PUBLIC_DEFAULT_LOCALE as default locale on server", async () => {
		vi.resetModules();

		vi.doMock("$app/environment", () => ({ browser: false }));
		vi.doMock("$env/static/public", () => ({ PUBLIC_DEFAULT_LOCALE: "en" }));

		const init = vi.fn();
		const register = vi.fn();
		vi.doMock("svelte-i18n", () => ({
			_: undefined,
			init,
			isLoading: undefined,
			locale: undefined,
			register,
			waitLocale: undefined,
		}));

		await import("./index.js");

		expect(init).toHaveBeenCalledWith({
			fallbackLocale: "en",
			initialLocale: "en",
		});
	});
});

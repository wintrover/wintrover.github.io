import { describe, expect, it, vi } from "vitest";

function hasKoPosts(files: Record<string, unknown>) {
	return Object.keys(files).some((key) => /posts[\\/]+ko[\\/]+/.test(key));
}

describe("glob", () => {
	it("VITE_LOCALE=en이면 ko 포스트가 포함되지 않는다", async () => {
		const prev = process.env.VITE_LOCALE;
		process.env.VITE_LOCALE = "en";
		vi.resetModules();
		try {
			const { getPostFiles } = await import("../src/lib/glob");
			const files = await getPostFiles();
			expect(hasKoPosts(files)).toBe(false);
		} finally {
			process.env.VITE_LOCALE = prev;
			vi.resetModules();
		}
	});

	it("VITE_LOCALE=ko이면 ko 포스트가 포함된다", async () => {
		const prev = process.env.VITE_LOCALE;
		process.env.VITE_LOCALE = "ko";
		vi.resetModules();
		try {
			const { getPostFiles } = await import("../src/lib/glob");
			const files = await getPostFiles();
			expect(hasKoPosts(files)).toBe(true);
		} finally {
			process.env.VITE_LOCALE = prev;
			vi.resetModules();
		}
	});

	it("VITE_LOCALE=auto이면 기본(postFiles)으로 폴백된다", async () => {
		const prev = process.env.VITE_LOCALE;
		process.env.VITE_LOCALE = "auto";
		vi.resetModules();
		try {
			const { getPostFiles } = await import("../src/lib/glob");
			const files = await getPostFiles();
			expect(typeof files).toBe("object");
		} finally {
			process.env.VITE_LOCALE = prev;
			vi.resetModules();
		}
	});
});

describe("glob.dev", () => {
	it("경로가 /ko로 시작하면 ko 포스트를 선택한다", async () => {
		const prev = navigator.language;
		Object.defineProperty(navigator, "language", {
			value: "en-US",
			configurable: true,
		});
		try {
			const { getPostFilesDev } = await import("../src/lib/glob.dev");
			const files = getPostFilesDev("/ko/");
			expect(hasKoPosts(files)).toBe(true);
		} finally {
			Object.defineProperty(navigator, "language", {
				value: prev,
				configurable: true,
			});
		}
	});

	it("경로가 /en로 시작하면 ko 포스트를 선택하지 않는다", async () => {
		const prev = navigator.language;
		Object.defineProperty(navigator, "language", {
			value: "ko-KR",
			configurable: true,
		});
		try {
			const { getPostFilesDev } = await import("../src/lib/glob.dev");
			const files = getPostFilesDev("/en/");
			expect(hasKoPosts(files)).toBe(false);
		} finally {
			Object.defineProperty(navigator, "language", {
				value: prev,
				configurable: true,
			});
		}
	});

	it("경로에 locale이 없으면 navigator.language로 결정한다", async () => {
		const prev = navigator.language;
		Object.defineProperty(navigator, "language", {
			value: "ko-KR",
			configurable: true,
		});
		try {
			const { getPostFilesDev } = await import("../src/lib/glob.dev");
			const files = getPostFilesDev("/");
			expect(hasKoPosts(files)).toBe(true);
		} finally {
			Object.defineProperty(navigator, "language", {
				value: prev,
				configurable: true,
			});
		}
	});
});

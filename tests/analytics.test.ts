import { beforeEach, describe, expect, test, vi } from "vitest";
import {
	resetAnalyticsState,
	resolveGaMeasurementId,
	resolvePagePath,
	startAnalytics,
	trackCurrentPageView,
} from "../src/lib/analytics";

describe("analytics", () => {
	beforeEach(() => {
		resetAnalyticsState();
		const scripts = Array.from(
			document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]'),
		);
		for (const script of scripts) {
			script.remove();
		}
		window.location.hash = "";
		document.title = "wintrover";
	});

	test("measurement id를 검증한다", () => {
		expect(resolveGaMeasurementId("G-AB12CD34")).toBe("G-AB12CD34");
		expect(resolveGaMeasurementId("  G-HELLO1  ")).toBe("G-HELLO1");
		expect(resolveGaMeasurementId("AW-123")).toBeNull();
		expect(resolveGaMeasurementId("")).toBeNull();
		expect(resolveGaMeasurementId(undefined)).toBeNull();
	});

	test("hash 라우트를 page_path로 변환한다", () => {
		expect(
			resolvePagePath({
				pathname: "/",
				search: "",
				hash: "#/post/slug",
			}),
		).toBe("/post/slug");
		expect(
			resolvePagePath({
				pathname: "/ko/",
				search: "?a=1",
				hash: "",
			}),
		).toBe("/ko/?a=1");
	});

	test("초기화 시 스크립트를 주입하고 페이지뷰를 전송한다", () => {
		const gtag = vi.fn();
		(window as Window & { gtag?: typeof gtag }).gtag = gtag;

		startAnalytics("G-TEST1234");

		const script = document.querySelector(
			'script[src*="googletagmanager.com/gtag/js?id=G-TEST1234"]',
		);
		expect(script).toBeTruthy();
		expect(gtag).toHaveBeenCalledWith("js", expect.any(Date));
		expect(gtag).toHaveBeenCalledWith("config", "G-TEST1234", {
			send_page_view: false,
		});
		expect(gtag).toHaveBeenCalledWith(
			"event",
			"page_view",
			expect.objectContaining({
				page_path: "/",
				page_title: "wintrover",
			}),
		);
	});

	test("hash 변경 시 추가 페이지뷰를 전송한다", () => {
		const gtag = vi.fn();
		(window as Window & { gtag?: typeof gtag }).gtag = gtag;
		startAnalytics("G-TEST1234");

		window.location.hash = "#/post/ga4";
		trackCurrentPageView();

		const pageViewCalls = gtag.mock.calls.filter(
			(call) => call[0] === "event" && call[1] === "page_view",
		);
		expect(pageViewCalls.length).toBe(2);
		expect(pageViewCalls[1]?.[2]).toEqual(
			expect.objectContaining({
				page_path: "/post/ga4",
			}),
		);
	});

	test("기본 gtag 큐 형식은 arguments 객체를 유지한다", () => {
		delete (window as Window & { gtag?: unknown }).gtag;
		startAnalytics("G-TEST1234");

		const queue =
			(window as Window & { dataLayer?: unknown[] }).dataLayer ?? [];
		expect(queue.length).toBeGreaterThan(0);
		const first = queue[0] as Record<string, unknown>;
		expect(Array.isArray(first)).toBe(false);
		expect(first[0]).toBe("js");
	});
});

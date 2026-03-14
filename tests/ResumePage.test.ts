import { cleanup, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import ResumePage from "../src/components/ResumePage.svelte";
import { site } from "../src/lib/resume/site";

describe("ResumePage", () => {
	beforeEach(() => {
		document.title = "wintrover blog";
	});

	afterEach(() => {
		cleanup();
	});

	test("이력서 내용이 렌더링되고, title/FontAwesome 링크가 관리되어야 함", async () => {
		const { unmount } = render(ResumePage);

		await tick();
		await tick();

		const fa = document.head.querySelector(
			`link[rel="stylesheet"][href="${site.fontAwesomeStylesheetUrl}"]`,
		);
		expect(fa).toBeInTheDocument();
		expect(document.title).toBe("wintrover's resume");

		expect(
			screen.getByRole("heading", { level: 1, name: "Suhyok Yun" }),
		).toBeInTheDocument();
		expect(screen.getByText("Product Engineer & Builder")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { level: 3, name: "Projects" }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
			"href",
			"https://github.com/wintrover",
		);
		expect(document.querySelector(".section.motion-reveal")).not.toBeNull();
		expect(document.querySelector(".cards.motion-stagger-list")).not.toBeNull();
		expect(document.querySelector(".card.motion-card")).not.toBeNull();

		unmount();
		expect(
			document.head.querySelector(
				`link[rel="stylesheet"][href="${site.fontAwesomeStylesheetUrl}"]`,
			),
		).toBeNull();
	});
});

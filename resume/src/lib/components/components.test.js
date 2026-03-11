import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

globalThis.__TEST_BROWSER__ ??= false;
vi.mock("$app/environment", () => ({
	get browser() {
		return globalThis.__TEST_BROWSER__;
	},
}));
let currentBase = "/base";
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
	return { _, locale, isLoading, init: () => {}, register: () => {} };
});

import EducationSection from "./EducationSection.svelte";
import ExperienceSection from "./ExperienceSection.svelte";
import Footer from "./Footer.svelte";
import Header from "./Header.svelte";
import LanguageSwitcher from "./LanguageSwitcher.svelte";
import LoadingSpinner from "./LoadingSpinner.svelte";
import ProjectsSection from "./ProjectsSection.svelte";

describe("components", () => {
	it("Header renders translated headings and links", async () => {
		const { _ } = await import("svelte-i18n");
		_.set((key) => key);

		const { site } = await import("$lib/utils/site.js");
		const originalEmail = site.email;

		const { rerender, unmount } = render(Header);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"site_title",
		);
		expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
			"site_subtitle",
		);
		expect(screen.getByText("wintrover@gmail.com")).toBeInTheDocument();
		expect(
			document.querySelectorAll('a[target="_blank"]').length,
		).toBeGreaterThanOrEqual(3);

		await rerender({});
		unmount();

		site.email = undefined;
		const { unmount: unmountNoEmail } = render(Header);
		expect(screen.queryByText(originalEmail)).not.toBeInTheDocument();
		unmountNoEmail();
		site.email = originalEmail;
	});

	it("LanguageSwitcher toggles locale from ko to en", async () => {
		const { locale } = await import("svelte-i18n");
		locale.set("ko");
		const setSpy = vi.spyOn(locale, "set");
		window.history.replaceState({}, "", "/ko/resume/");
		const navigate = vi.fn();

		render(LanguageSwitcher, { navigate });
		const button = screen.getByRole("button");
		expect(button).toHaveTextContent("lang_switcher_en");
		await fireEvent.click(button);
		expect(setSpy).toHaveBeenCalledWith("en");
		expect(new URL(navigate.mock.calls[0][0]).pathname).toBe("/en/resume/");
	});

	it("LanguageSwitcher toggles locale from en to ko", async () => {
		const { locale } = await import("svelte-i18n");
		locale.set("en");
		const setSpy = vi.spyOn(locale, "set");
		window.history.replaceState({}, "", "/en/resume/");
		const navigate = vi.fn();

		render(LanguageSwitcher, { navigate });
		const button = screen.getByRole("button");
		expect(button).toHaveTextContent("lang_switcher_ko");
		await fireEvent.click(button);
		expect(setSpy).toHaveBeenCalledWith("ko");
		expect(new URL(navigate.mock.calls[0][0]).pathname).toBe("/ko/resume/");
	});

	it("LanguageSwitcher prefixes locale when url has no language prefix", async () => {
		const { locale } = await import("svelte-i18n");
		locale.set("ko");
		window.history.replaceState({}, "", "/resume/");
		const navigate = vi.fn();

		render(LanguageSwitcher, { navigate });
		await fireEvent.click(screen.getByRole("button"));
		expect(new URL(navigate.mock.calls[0][0]).pathname).toBe("/en/resume/");
	});

	it("LanguageSwitcher handles URL constructor failure", async () => {
		const { locale } = await import("svelte-i18n");
		locale.set("ko");
		const setSpy = vi.spyOn(locale, "set");
		const navigate = vi.fn();

		const OriginalURL = globalThis.URL;
		globalThis.URL = class {
			constructor() {
				throw new Error("url fail");
			}
		};

		render(LanguageSwitcher, { navigate });
		await fireEvent.click(screen.getByRole("button"));
		expect(setSpy).toHaveBeenCalledWith("en");
		expect(navigate).not.toHaveBeenCalled();

		globalThis.URL = OriginalURL;
	});

	it("LanguageSwitcher handles navigation failure", async () => {
		const { locale } = await import("svelte-i18n");
		locale.set("ko");
		window.history.replaceState({}, "", "/ko/resume/");
		const navigate = () => {
			throw new Error("nav fail");
		};

		render(LanguageSwitcher, { navigate });
		await expect(
			fireEvent.click(screen.getByRole("button")),
		).resolves.toBeTruthy();
	});

	it("AboutSection uses base path for image and renders HTML content", async () => {
		currentBase = "/base";
		vi.resetModules();
		const { _ } = await import("svelte-i18n");
		_.set((key) => key);
		const { render } = await import("@testing-library/svelte");
		const { default: AboutSection } = await import("./AboutSection.svelte");
		const { container, unmount } = render(AboutSection);
		const img = container.querySelector("img");
		expect(img?.getAttribute("src")).toBe("/base/assets/images/profile.png");
		expect(container.querySelector("p")).toHaveTextContent("about_content");
		unmount();
	});

	it("AboutSection renders image path without base when base is empty", async () => {
		currentBase = "";
		vi.resetModules();
		const { _ } = await import("svelte-i18n");
		_.set((key) => key);
		const { render } = await import("@testing-library/svelte");
		const { default: AboutSection } = await import("./AboutSection.svelte");
		const { container, rerender, unmount } = render(AboutSection);
		const img = container.querySelector("img");
		expect(img?.getAttribute("src")).toBe("/assets/images/profile.png");

		_.set((key) => (key === "profile_alt" ? undefined : key));
		const { tick } = await import("svelte");
		await tick();
		await rerender({});
		expect(img?.getAttribute("alt")).toBeNull();
		_.set((key) => key);

		unmount();
	});

	it("ProjectsSection renders list, links, and separators", () => {
		render(ProjectsSection);
		expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
			"section_title_projects",
		);
		expect(screen.getByText("projects.cvfactory.title")).toBeInTheDocument();
		expect(
			screen.getByText("projects.data_engineer_intern_task.title"),
		).toBeInTheDocument();
		expect(
			screen.getByText("projects.webkyc_process.title"),
		).toBeInTheDocument();

		expect(document.querySelectorAll(".project-links a").length).toBe(4);
		expect(document.querySelectorAll(".border-weak").length).toBe(2);
		const logos = document.querySelectorAll("img.project-logo");
		expect(logos.length).toBe(0);
	});

	it("ExperienceSection renders list and separators", () => {
		render(ExperienceSection);
		expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
			"section_title_experience",
		);
		expect(screen.getByText("experience.focc_inc.title")).toBeInTheDocument();
		expect(
			screen.getByText("experience.insight_marketing_labs.title"),
		).toBeInTheDocument();
		expect(screen.getByText("experience.vizcam.title")).toBeInTheDocument();
		expect(document.querySelectorAll(".border-weak").length).toBe(2);
	});

	it("EducationSection renders list and separators", () => {
		render(EducationSection);
		expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
			"section_title_education",
		);
		expect(
			screen.getByText("education.intel_ai_for_future_workforce.title"),
		).toBeInTheDocument();
		expect(
			screen.getByText("education.halla_university.title"),
		).toBeInTheDocument();
		expect(document.querySelectorAll(".border-weak").length).toBe(1);
	});

	it("Footer renders translated message", () => {
		render(Footer);
		expect(screen.getByText("footer_thank_you")).toBeInTheDocument();
	});

	it("LoadingSpinner renders default and custom styles", async () => {
		const { container, rerender } = render(LoadingSpinner);
		const spinner1 = container.querySelector(".spinner");
		expect(spinner1.getAttribute("style")).toContain("width: 40px;");
		expect(spinner1.getAttribute("style")).toContain("height: 40px;");
		expect(screen.getByText("loading_message")).toBeInTheDocument();

		await rerender({ size: "10px" });
		expect(spinner1.getAttribute("style")).toContain("width: 10px;");
		expect(spinner1.getAttribute("style")).toContain("height: 10px;");

		await rerender({ color: "red" });
		expect(spinner1.getAttribute("style")).toContain(
			"border-color: red transparent red transparent;",
		);

		await rerender({ size: "10px", color: "red" });
		expect(spinner1.getAttribute("style")).toContain("width: 10px;");
		expect(spinner1.getAttribute("style")).toContain(
			"border-color: red transparent red transparent;",
		);

		await rerender({ size: undefined, color: undefined });

		const { container: c2 } = render(LoadingSpinner, {
			props: { size: "10px", color: "red" },
		});
		const spinner2 = c2.querySelector(".spinner");
		expect(spinner2.getAttribute("style")).toContain("width: 10px;");
		expect(spinner2.getAttribute("style")).toContain("height: 10px;");
		expect(spinner2.getAttribute("style")).toContain(
			"border-color: red transparent red transparent;",
		);
	});
});

import { render, screen } from "@testing-library/svelte";
import fc from "fast-check";
import { describe, expect, test, vi } from "vitest";
import Footer from "../src/components/Footer.svelte";
import { siteConfig } from "../src/lib/config";

// Mock siteConfig
vi.mock("../src/lib/config", () => ({
	siteConfig: {
		social: {
			email: "test@example.com",
			github: "testuser",
			instagram: "testinst",
			linkedin: "testlink",
		},
	},
}));

describe("Footer Component", () => {
	const safeUser = (minLength: number, maxLength: number) =>
		fc.string({
			unit: fc.constantFrom(
				..."abcdefghijklmnopqrstuvwxyz0123456789_".split(""),
			),
			minLength,
			maxLength,
		});

	test("소셜 링크들이 올바르게 렌더링되어야 함", () => {
		render(Footer);

		const emailLink = screen.getByTitle("Email");
		expect(emailLink).toHaveAttribute("href", "mailto:test@example.com");

		const githubLink = screen.getByTitle("GitHub");
		expect(githubLink).toHaveAttribute("href", "https://github.com/testuser");

		const instagramLink = screen.getByTitle("Instagram");
		expect(instagramLink).toHaveAttribute(
			"href",
			"https://instagram.com/testinst",
		);

		const linkedinLink = screen.getByTitle("LinkedIn");
		expect(linkedinLink).toHaveAttribute(
			"href",
			"https://linkedin.com/in/testlink",
		);
	});

	test("소셜 값이 모두 비어있으면 링크가 렌더링되지 않아야 함", () => {
		vi.mocked(siteConfig).social = {
			email: "",
			github: "",
			instagram: "",
			linkedin: "",
		};

		render(Footer);

		expect(screen.queryByTitle("Email")).not.toBeInTheDocument();
		expect(screen.queryByTitle("GitHub")).not.toBeInTheDocument();
		expect(screen.queryByTitle("Instagram")).not.toBeInTheDocument();
		expect(screen.queryByTitle("LinkedIn")).not.toBeInTheDocument();
	});

	test("PBT: 소셜 값 유무에 따라 링크 렌더링이 일관되어야 함", () => {
		fc.assert(
			fc.property(
				fc.record({
					email: fc.oneof(fc.constant(""), fc.emailAddress()),
					github: fc.oneof(fc.constant(""), safeUser(1, 12)),
					instagram: fc.oneof(fc.constant(""), safeUser(1, 12)),
					linkedin: fc.oneof(fc.constant(""), safeUser(1, 12)),
				}),
				({ email, github, instagram, linkedin }) => {
					document.body.innerHTML = "";
					vi.mocked(siteConfig).social = { email, github, instagram, linkedin };

					const { unmount } = render(Footer);

					if (email) {
						expect(screen.getByTitle("Email")).toHaveAttribute(
							"href",
							`mailto:${email}`,
						);
					} else {
						expect(screen.queryByTitle("Email")).not.toBeInTheDocument();
					}

					if (github) {
						expect(screen.getByTitle("GitHub")).toHaveAttribute(
							"href",
							`https://github.com/${github}`,
						);
					} else {
						expect(screen.queryByTitle("GitHub")).not.toBeInTheDocument();
					}

					if (instagram) {
						expect(screen.getByTitle("Instagram")).toHaveAttribute(
							"href",
							`https://instagram.com/${instagram}`,
						);
					} else {
						expect(screen.queryByTitle("Instagram")).not.toBeInTheDocument();
					}

					if (linkedin) {
						expect(screen.getByTitle("LinkedIn")).toHaveAttribute(
							"href",
							`https://linkedin.com/in/${linkedin}`,
						);
					} else {
						expect(screen.queryByTitle("LinkedIn")).not.toBeInTheDocument();
					}

					unmount();
				},
			),
			{ numRuns: 50 },
		);
	});
});

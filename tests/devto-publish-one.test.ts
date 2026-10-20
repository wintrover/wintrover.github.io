import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
	buildDevtoDraftPayload,
	buildGithubRunUrl,
	buildPublishOneSummary,
	classifyDevtoError,
	type DevtoArticle,
	decideReconcileAction,
	isLinkedInAutoPostEnabled,
	listAllDevtoArticles,
	normalizeCanonicalUrl,
	type PreparedPost,
	parseDevtoArticle,
	parsePlatforms,
	parsePublishOneArgs,
	publishOneExitCode,
	runPublishOne,
	selectExistingDevtoArticle,
} from "../scripts/post-to-dev";

type FakeRequest = { url: string; init?: RequestInit };

function fakeResponse(body: unknown, status = 200): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
		text: async () => JSON.stringify(body),
	} as unknown as Response;
}

function makeFetch(
	routes: {
		match: (url: string, init?: RequestInit) => boolean;
		respond: (url: string, init?: RequestInit) => Response;
	}[],
) {
	const calls: FakeRequest[] = [];
	const fetchFn = async (
		url: string,
		init?: RequestInit,
	): Promise<Response> => {
		calls.push({ url, init });
		const route = routes.find((candidate) => candidate.match(url, init));
		if (!route) return fakeResponse({ error: "no route" }, 599);
		return route.respond(url, init);
	};
	return { fetchFn, calls, routes };
}

function article(
	overrides: Partial<DevtoArticle> & { id: number },
): DevtoArticle {
	return { published: false, ...overrides };
}

function listPageRouter(pages: DevtoArticle[][]) {
	return makeFetch([
		{
			match: (url) => url.includes("/api/articles/me/all"),
			respond: (url) => {
				const page = Number(new URL(url).searchParams.get("page") || "1");
				return fakeResponse(pages[page - 1] ?? []);
			},
		},
	]);
}

const basePost: PreparedPost = {
	slug: "2026-06-01-1",
	postKey: "2026-06-01-1",
	filePath: "src/posts/archright/2026-06-01-1.md",
	title: "Publish One Test Post",
	description: "excerpt",
	linkedInIntro: "intro",
	canonicalUrl: "https://wintrover.github.io/post/publish-one-test/",
	tags: ["testing"],
	bodyMarkdown: "# Hello publish one",
	firstImageUrl: null,
};

const CANONICAL = "https://wintrover.github.io/post/publish-one-test/";

function writeTempPost(dir: string): string {
	const postPath = path.join(dir, "2026-06-01-1.md");
	fs.writeFileSync(
		postPath,
		[
			"---",
			'title: "Publish One Test Post"',
			"description: excerpt",
			"tags: testing",
			`canonical_url: ${CANONICAL}`,
			"---",
			"",
			"# Hello publish one",
			"",
		].join("\n"),
		"utf-8",
	);
	return postPath;
}

function withTempDir(): { dir: string; dispose: () => void } {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "publish-one-test-"));
	return {
		dir,
		dispose: () => fs.rmSync(dir, { recursive: true, force: true }),
	};
}

// Stateful DEV.to fake: `/me/all` serves the mutable article store, so a
// created draft shows up in later re-lists just like the real API.
function articleApiRoutes(options: {
	existing?: DevtoArticle[];
	createdDraftId?: number;
	relistDraft?: "draft" | "missing" | "published" | "wrong-canonical";
}) {
	const slug = "publish-one-test";
	const articles = [...(options.existing ?? [])];
	return makeFetch([
		{
			match: (url) => url.includes("/api/articles/me/all"),
			respond: (url) => {
				const page = Number(new URL(url).searchParams.get("page") || "1");
				return fakeResponse(page === 1 ? articles : []);
			},
		},
		{
			match: (url, init) =>
				url.endsWith("/api/articles") && (init?.method ?? "GET") === "POST",
			respond: () => {
				const draftId = options.createdDraftId ?? 501;
				const relist = options.relistDraft ?? "draft";
				if (relist === "draft") {
					articles.push(
						article({
							id: draftId,
							slug,
							url: `https://dev.to/wintrover/${slug}`,
							published: false,
							canonical_url: CANONICAL,
						}),
					);
				}
				if (relist === "published") {
					articles.push(
						article({
							id: draftId,
							slug,
							url: `https://dev.to/wintrover/${slug}`,
							published: true,
							canonical_url: CANONICAL,
						}),
					);
				}
				if (relist === "wrong-canonical") {
					articles.push(
						article({
							id: draftId,
							slug,
							url: `https://dev.to/wintrover/${slug}`,
							published: false,
							canonical_url: "https://example.com/wrong/",
						}),
					);
				}
				return fakeResponse({
					id: draftId,
					slug,
					url: `https://dev.to/wintrover/${slug}`,
					published: false,
					canonical_url: CANONICAL,
				});
			},
		},
	]);
}

async function runInTmp(
	fetchFn: (url: string, init?: RequestInit) => Promise<Response>,
	overrides: Partial<Parameters<typeof runPublishOne>[0]> = {},
) {
	const tmp = withTempDir();
	try {
		const postPath = writeTempPost(tmp.dir);
		const resultPath = path.join(tmp.dir, "publish-result.json");
		const result = await runPublishOne({
			postPath,
			platform: "devto",
			dryRun: false,
			failInjection: "none",
			apiKey: "test-key",
			publicBaseUrl: "https://wintrover.github.io/",
			resultPath,
			fetchFn,
			sleepFn: async () => {},
			...overrides,
		});
		return {
			result,
			resultPath,
			persisted: JSON.parse(fs.readFileSync(resultPath, "utf-8")) as Record<
				string,
				unknown
			>,
		};
	} finally {
		tmp.dispose();
	}
}

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("normalizeCanonicalUrl", () => {
	test("https 화이트리스트, 호스트 소문화, 기본 포트 제거를 적용한다", () => {
		expect(normalizeCanonicalUrl("https://Example.com:443/post/a/")).toBe(
			"https://example.com/post/a/",
		);
		expect(normalizeCanonicalUrl("http://example.com/post/a")).toBe(
			"https://example.com/post/a/",
		);
		expect(normalizeCanonicalUrl("http://EXAMPLE.com:80/")).toBe(
			"https://example.com/",
		);
	});

	test("trailing slash를 단일 슬래시로 정규화한다", () => {
		expect(normalizeCanonicalUrl("https://example.com")).toBe(
			"https://example.com/",
		);
		expect(normalizeCanonicalUrl("https://example.com/")).toBe(
			"https://example.com/",
		);
		expect(normalizeCanonicalUrl("https://example.com///post/a///")).toBe(
			"https://example.com/post/a/",
		);
	});

	test("query와 hash를 제거한다", () => {
		expect(
			normalizeCanonicalUrl("https://example.com/post/a/?utm=x#frag"),
		).toBe("https://example.com/post/a/");
	});

	test("빈 값과 파싱 불가 입력을 안전하게 처리한다", () => {
		expect(normalizeCanonicalUrl("")).toBe("");
		expect(normalizeCanonicalUrl("   ")).toBe("");
		expect(normalizeCanonicalUrl("https://not a url")).toBe(
			"https://not a url",
		);
		expect(normalizeCanonicalUrl("example.com/post/a")).toBe(
			"https://example.com/post/a/",
		);
	});
});

describe("selectExistingDevtoArticle", () => {
	test("canonical 매칭으로 none/one/ambiguous를 판별한다", () => {
		const a = article({
			id: 1,
			title: "A",
			canonical_url: "https://wintrover.github.io/post/a/",
		});
		const b = article({
			id: 2,
			title: "A",
			canonical_url: "https://wintrover.github.io/post/a",
		});
		expect(selectExistingDevtoArticle([], CANONICAL)).toEqual({ kind: "none" });
		expect(
			selectExistingDevtoArticle(
				[
					article({
						id: 3,
						title: "Other",
						canonical_url: "https://x.dev/other/",
					}),
					a,
				],
				"https://wintrover.github.io/post/a",
			),
		).toEqual({ kind: "one", article: a });
		const selection = selectExistingDevtoArticle(
			[a, b],
			"https://wintrover.github.io/post/a/",
		);
		expect(selection.kind).toBe("ambiguous");
		if (selection.kind === "ambiguous") {
			expect(selection.articles.map((item) => item.id)).toEqual([1, 2]);
		}
	});

	test("canonical이 빈 경우 정규화된 제목으로 폴백 매칭한다", () => {
		const draft = article({ id: 9, title: "Publish  ONE   test post" });
		expect(
			selectExistingDevtoArticle([draft], "", "publish one TEST Post"),
		).toEqual({ kind: "one", article: draft });
		expect(selectExistingDevtoArticle([draft], "", "different title")).toEqual({
			kind: "none",
		});
		expect(selectExistingDevtoArticle([draft], "", "")).toEqual({
			kind: "none",
		});
	});

	test("canonical이 다르면 매칭하지 않는다", () => {
		const other = article({
			id: 5,
			title: "Publish One Test Post",
			canonical_url: "https://wintrover.github.io/post/other/",
		});
		expect(
			selectExistingDevtoArticle([other], CANONICAL, "Publish One Test Post"),
		).toEqual({
			kind: "none",
		});
	});
});

describe("decideReconcileAction", () => {
	test("fake API 목록의 단일 draft canonical 매칭은 adopt_draft 결정이다", async () => {
		const { fetchFn } = listPageRouter([
			[
				article({
					id: 10,
					title: "Other",
					published: true,
					canonical_url: "https://wintrover.github.io/post/other/",
				}),
			],
			[
				article({
					id: 11,
					title: "Publish One Test Post",
					published: false,
					canonical_url: CANONICAL,
				}),
			],
			[],
		]);
		const articles = await listAllDevtoArticles("key", {
			fetchFn,
			sleepFn: async () => {},
		});
		const selection = selectExistingDevtoArticle(articles, CANONICAL);
		const action = decideReconcileAction(selection);
		expect(action).toBe("adopt_draft");
		expect(action).not.toBe("create_draft");
	});

	test("결정 매핑을 적용한다", () => {
		expect(decideReconcileAction({ kind: "none" })).toBe("create_draft");
		expect(
			decideReconcileAction({
				kind: "one",
				article: article({ id: 1, published: true }),
			}),
		).toBe("already_published");
		expect(
			decideReconcileAction({
				kind: "one",
				article: article({ id: 1, published: false }),
			}),
		).toBe("adopt_draft");
		expect(
			decideReconcileAction({
				kind: "ambiguous",
				articles: [article({ id: 1 }), article({ id: 2 })],
			}),
		).toBe("ambiguous");
	});

	test("인증 목록의 draft 재판정은 published 플래그만 본다(published_at이 있어도 draft로 입양한다)", () => {
		expect(
			decideReconcileAction({
				kind: "one",
				article: article({
					id: 3,
					published: false,
					published_at: "2026-06-01T00:00:00Z",
				}),
			}),
		).toBe("adopt_draft");
	});
});

describe("classifyDevtoError", () => {
	test("4xx(408, 429 제외)는 failed로 분류한다", () => {
		expect(classifyDevtoError(400, "bad request")).toBe("failed");
		expect(classifyDevtoError(401, "unauthorized")).toBe("failed");
		expect(classifyDevtoError(404, "not found")).toBe("failed");
		expect(classifyDevtoError(422, "validation")).toBe("failed");
	});

	test("408, 429, 5xx, 네트워크/타임아웃은 unknown으로 분류한다", () => {
		expect(classifyDevtoError(408, "timeout")).toBe("unknown");
		expect(classifyDevtoError(429, "rate limited")).toBe("unknown");
		expect(classifyDevtoError(500, "server error")).toBe("unknown");
		expect(classifyDevtoError(503, "unavailable")).toBe("unknown");
		expect(classifyDevtoError(0, "")).toBe("unknown");
		expect(classifyDevtoError(0, "fetch failed: network error")).toBe(
			"unknown",
		);
		expect(classifyDevtoError(200, "unexpected")).toBe("unknown");
	});
});

describe("payload builders", () => {
	test("draft payload는 published:false와 정규화된 canonical을 담는다", () => {
		const payload = buildDevtoDraftPayload(
			basePost,
			"https://wintrover.github.io/post/publish-one-test/?x=1",
		);
		expect(payload.article.published).toBe(false);
		expect(payload.article.canonical_url).toBe(CANONICAL);
		expect(payload.article.title).toBe(basePost.title);
		expect(payload.article.body_markdown).toBe(basePost.bodyMarkdown);
		expect(payload.article.tags).toEqual(["testing"]);
		expect(payload.article.cover_image).toBeUndefined();
	});
});

describe("parseDevtoArticle", () => {
	test("unknown 입력을 타입 가드로 걸러낸다", () => {
		expect(parseDevtoArticle(null)).toBeNull();
		expect(parseDevtoArticle("article")).toBeNull();
		expect(parseDevtoArticle({ id: "1" })).toBeNull();
		const parsed = parseDevtoArticle({
			id: 3,
			title: "T",
			published: true,
			canonical_url: CANONICAL,
			extra: "ignored",
		});
		expect(parsed).toEqual({
			id: 3,
			title: "T",
			published: true,
			canonical_url: CANONICAL,
		});
	});
});

describe("listAllDevtoArticles", () => {
	test("빈 페이지까지 페이지네이션하고 요청 사이 350ms 이상 스로틀한다", async () => {
		const { fetchFn, calls } = listPageRouter([
			[article({ id: 1 }), article({ id: 2 })],
			[article({ id: 3 })],
			[],
		]);
		const sleeps: number[] = [];
		const articles = await listAllDevtoArticles("key", {
			fetchFn,
			sleepFn: async (ms) => {
				sleeps.push(ms);
			},
		});
		expect(articles.map((item) => item.id)).toEqual([1, 2, 3]);
		expect(calls.map((call) => call.url)).toEqual([
			"https://dev.to/api/articles/me/all?per_page=1000&page=1",
			"https://dev.to/api/articles/me/all?per_page=1000&page=2",
			"https://dev.to/api/articles/me/all?per_page=1000&page=3",
		]);
		expect(sleeps).toEqual([350, 350]);
	});

	test("페이지 요청 실패는 에러로 처리한다", async () => {
		const { fetchFn } = makeFetch([
			{
				match: (url) => url.includes("/api/articles/me/all"),
				respond: () => fakeResponse({ error: "boom" }, 500),
			},
		]);
		await expect(
			listAllDevtoArticles("key", { fetchFn, sleepFn: async () => {} }),
		).rejects.toThrow("page 1 (500)");
	});

	test("네트워크 예외도 에러로 처리한다", async () => {
		const fetchFn = async () => {
			throw new Error("econnreset");
		};
		await expect(
			listAllDevtoArticles("key", { fetchFn, sleepFn: async () => {} }),
		).rejects.toThrow("econnreset");
	});
});

describe("parsePublishOneArgs", () => {
	test("정상 인자를 파싱한다", () => {
		expect(
			parsePublishOneArgs([
				"--publish-one",
				"src/posts/archright/2026-05-04-6.md",
				"--platform",
				"devto",
				"--dry-run",
			]),
		).toEqual({
			postPath: "src/posts/archright/2026-05-04-6.md",
			platform: "devto",
			dryRun: true,
			failInjection: "none",
		});
		expect(
			parsePublishOneArgs([
				"--fail-injection",
				"post_response_loss",
				"--publish-one",
				"a.md",
				"--platform",
				"DEVTO",
			]).failInjection,
		).toBe("post_response_loss");
	});

	test("잘못된 인자는 거부한다", () => {
		expect(() => parsePublishOneArgs(["--platform", "devto"])).toThrow(
			"--publish-one requires",
		);
		expect(() => parsePublishOneArgs(["--publish-one", "a.md"])).toThrow(
			"--platform must be devto",
		);
		expect(() =>
			parsePublishOneArgs(["--publish-one", "a.md", "--platform", "linkedin"]),
		).toThrow("--platform must be devto");
		expect(() =>
			parsePublishOneArgs([
				"--publish-one",
				"a.md",
				"--platform",
				"devto",
				"--fail-injection",
				"chaos",
			]),
		).toThrow("Invalid --fail-injection value");
		expect(() =>
			parsePublishOneArgs([
				"--publish-one",
				"a.md",
				"--platform",
				"devto",
				"--wat",
			]),
		).toThrow("Unknown publish-one argument");
	});
});

describe("runPublishOne (draft-only, fake API)", () => {
	test("기존 게시물이 published:true면 published_exists로 실패하고 unpublish-one이 필요하다", async () => {
		const { fetchFn, calls } = articleApiRoutes({
			existing: [
				article({
					id: 7,
					published: true,
					slug: "already-public",
					canonical_url: CANONICAL,
				}),
			],
		});
		const { result, persisted } = await runInTmp(fetchFn);
		expect(result.state).toBe("published_exists");
		expect(result.method).toBe("already_published");
		expect(result.id).toBe(7);
		expect(result.observedPublished).toBe(true);
		expect(result.observedDraft).toBeUndefined();
		expect(result.attempts).toBe(0);
		expect(publishOneExitCode(result)).toBe(1);
		expect(calls.filter((call) => call.init?.method)).toHaveLength(0);
		expect(persisted.state).toBe("published_exists");
	});

	test("없으면 draft를 생성하고 /me/all 재조회로 published:false를 검증한다", async () => {
		const { fetchFn, calls } = articleApiRoutes({ createdDraftId: 501 });
		const { result, persisted } = await runInTmp(fetchFn);
		expect(result.state).toBe("draft_verified");
		expect(result.method).toBe("created");
		expect(result.draftId).toBe(501);
		expect(result.id).toBe(501);
		expect(result.slug).toBe("publish-one-test");
		expect(result.attempts).toBe(1);
		expect(result.observedDraft).toBe(true);
		expect(result.observedPublished).toBe(false);
		expect(publishOneExitCode(result)).toBe(0);
		const methods = calls.map((call) => call.init?.method ?? "GET");
		expect(methods).toEqual(["GET", "POST", "GET", "GET"]);
		expect(calls.filter((call) => call.init?.method === "PUT")).toHaveLength(0);
		expect(persisted.state).toBe("draft_verified");
		expect(persisted.observedDraft).toBe(true);
		expect(persisted.observedPublished).toBe(false);
	});

	test("canonical 매칭 draft는 쓰기 없이 입양하고 재조회로 검증한다", async () => {
		const { fetchFn, calls } = articleApiRoutes({
			existing: [
				article({
					id: 42,
					published: false,
					slug: "existing-draft-slug",
					canonical_url: CANONICAL,
				}),
			],
		});
		const { result, persisted } = await runInTmp(fetchFn);
		expect(result.state).toBe("draft_verified");
		expect(result.method).toBe("adopted_draft");
		expect(result.draftId).toBe(42);
		expect(result.id).toBe(42);
		expect(result.attempts).toBe(0);
		expect(result.observedDraft).toBe(true);
		expect(result.observedPublished).toBe(false);
		expect(publishOneExitCode(result)).toBe(0);
		expect(calls.filter((call) => call.init?.method)).toHaveLength(0);
		expect(persisted.state).toBe("draft_verified");
	});

	test("재조회에서 draft가 아니면(published !== false) unknown으로 실패한다", async () => {
		const { fetchFn } = articleApiRoutes({
			createdDraftId: 501,
			relistDraft: "published",
		});
		const { result } = await runInTmp(fetchFn);
		expect(result.state).toBe("unknown");
		expect(result.observedDraft).toBeUndefined();
		expect(publishOneExitCode(result)).toBe(1);
	});

	test("재조회에서 draft를 못 찾으면 unknown으로 실패한다", async () => {
		const { fetchFn } = articleApiRoutes({
			createdDraftId: 501,
			relistDraft: "missing",
		});
		const { result } = await runInTmp(fetchFn);
		expect(result.state).toBe("unknown");
		expect(result.observedDraft).toBeUndefined();
		expect(publishOneExitCode(result)).toBe(1);
	});

	test("재조회한 draft의 canonical이 다르면 unknown으로 실패한다", async () => {
		const { fetchFn } = articleApiRoutes({
			createdDraftId: 501,
			relistDraft: "wrong-canonical",
		});
		const { result } = await runInTmp(fetchFn);
		expect(result.state).toBe("unknown");
		expect(result.observedDraft).toBeUndefined();
		expect(publishOneExitCode(result)).toBe(1);
	});

	test("재조회 요청이 실패하면 unknown으로 종료한다", async () => {
		const routes = articleApiRoutes({ createdDraftId: 501 });
		let listCalls = 0;
		const fetchFn = async (url: string, init?: RequestInit) => {
			if (url.includes("/api/articles/me/all")) {
				listCalls += 1;
				if (listCalls >= 3) return fakeResponse({ error: "boom" }, 500);
			}
			return routes.fetchFn(url, init);
		};
		const { result } = await runInTmp(fetchFn);
		expect(result.state).toBe("unknown");
		expect(publishOneExitCode(result)).toBe(1);
	});

	test("생성 POST가 5xx면 unknown이고 재시도 없이 종료한다", async () => {
		const routes = articleApiRoutes({ createdDraftId: 501 });
		routes.routes[1].respond = () => fakeResponse({ error: "boom" }, 500);
		let postCalls = 0;
		const fetchFn = async (url: string, init?: RequestInit) => {
			if (url.endsWith("/api/articles") && init?.method === "POST") {
				postCalls += 1;
			}
			return routes.fetchFn(url, init);
		};
		const { result } = await runInTmp(fetchFn);
		expect(result.state).toBe("unknown");
		expect(result.attempts).toBe(1);
		expect(postCalls).toBe(1);
		expect(publishOneExitCode(result)).toBe(1);
	});

	test("생성 POST가 4xx면 failed로 종료한다", async () => {
		const routes = articleApiRoutes({ createdDraftId: 501 });
		routes.routes[1].respond = () => fakeResponse({ error: "no" }, 422);
		const { result } = await runInTmp(routes.fetchFn);
		expect(result.state).toBe("failed");
		expect(publishOneExitCode(result)).toBe(1);
	});

	test("post_response_loss 주입은 unknown으로 끝나고, 다음 실행은 draft를 입양해 중복 생성하지 않는다", async () => {
		const routes = articleApiRoutes({ createdDraftId: 501 });
		const first = await runInTmp(routes.fetchFn, {
			failInjection: "post_response_loss",
		});
		expect(first.result.state).toBe("unknown");
		expect(first.result.method).toBe("unknown");
		expect(first.result.attempts).toBe(1);
		expect(publishOneExitCode(first.result)).toBe(1);
		expect(
			routes.calls.filter((call) => call.init?.method === "POST"),
		).toHaveLength(1);
		expect(
			routes.calls.filter((call) => call.init?.method === "PUT"),
		).toHaveLength(0);

		const second = await runInTmp(routes.fetchFn);
		expect(second.result.state).toBe("draft_verified");
		expect(second.result.method).toBe("adopted_draft");
		expect(second.result.draftId).toBe(501);
		expect(second.result.observedDraft).toBe(true);
		expect(second.result.observedPublished).toBe(false);
		expect(publishOneExitCode(second.result)).toBe(0);
		expect(
			routes.calls.filter((call) => call.init?.method === "POST"),
		).toHaveLength(1);
	});

	test("pre_post 주입은 목록 조회 후 쓰기 없이 failed로 종료한다", async () => {
		const { fetchFn, calls } = articleApiRoutes({
			existing: [
				article({ id: 42, published: false, canonical_url: CANONICAL }),
			],
		});
		const { result } = await runInTmp(fetchFn, {
			failInjection: "pre_post",
		});
		expect(result.state).toBe("failed");
		expect(result.attempts).toBe(0);
		expect(publishOneExitCode(result)).toBe(1);
		expect(calls).toHaveLength(2);
		expect(calls.filter((call) => call.init?.method)).toHaveLength(0);
	});

	test("복수 매칭은 ambiguous로 종료하고 쓰기가 없다", async () => {
		const { fetchFn, calls } = articleApiRoutes({
			existing: [
				article({ id: 1, published: false, canonical_url: CANONICAL }),
				article({
					id: 2,
					published: false,
					canonical_url: "https://wintrover.github.io/post/publish-one-test",
				}),
			],
		});
		const { result } = await runInTmp(fetchFn);
		expect(result.state).toBe("ambiguous");
		expect(result.method).toBe("failed");
		expect(publishOneExitCode(result)).toBe(1);
		expect(calls).toHaveLength(2);
		expect(calls.filter((call) => call.init?.method)).toHaveLength(0);
	});

	test("dry-run은 판결만 기록하고 쓰기 요청이 없다", async () => {
		const { fetchFn, calls } = articleApiRoutes({
			existing: [
				article({ id: 42, published: false, canonical_url: CANONICAL }),
			],
		});
		const { result } = await runInTmp(fetchFn, { dryRun: true });
		expect(result.state).toBe("dry_run");
		expect(result.method).toBe("none");
		expect(result.observedDraft).toBeUndefined();
		expect(publishOneExitCode(result)).toBe(0);
		expect(calls.filter((call) => call.init?.method)).toHaveLength(0);
	});

	test("DEVTO_API_KEY가 없으면 failed로 종료하고 결과 파일을 쓴다", async () => {
		vi.stubEnv("DEVTO_API_KEY", "");
		const { fetchFn, calls } = articleApiRoutes({ createdDraftId: 501 });
		const tmp = withTempDir();
		try {
			const postPath = writeTempPost(tmp.dir);
			const resultPath = path.join(tmp.dir, "publish-result.json");
			const result = await runPublishOne({
				postPath,
				platform: "devto",
				dryRun: false,
				failInjection: "none",
				publicBaseUrl: "https://wintrover.github.io/",
				resultPath,
				fetchFn,
				sleepFn: async () => {},
			});
			expect(result.state).toBe("failed");
			expect(result.method).toBe("failed");
			expect(publishOneExitCode(result)).toBe(1);
			expect(fs.existsSync(resultPath)).toBe(true);
			expect(calls).toHaveLength(0);
		} finally {
			tmp.dispose();
		}
	});

	test("존재하지 않는 포스트 파일은 failed로 종료한다", async () => {
		const { fetchFn, calls } = articleApiRoutes({ createdDraftId: 501 });
		const tmp = withTempDir();
		try {
			const resultPath = path.join(tmp.dir, "publish-result.json");
			const result = await runPublishOne({
				postPath: path.join(tmp.dir, "missing.md"),
				platform: "devto",
				dryRun: false,
				failInjection: "none",
				apiKey: "test-key",
				publicBaseUrl: "https://wintrover.github.io/",
				resultPath,
				fetchFn,
				sleepFn: async () => {},
			});
			expect(result.state).toBe("failed");
			expect(fs.existsSync(resultPath)).toBe(true);
			expect(calls).toHaveLength(0);
		} finally {
			tmp.dispose();
		}
	});
});

describe("publish-one helpers", () => {
	test("buildGithubRunUrl은 환경 변수가 모일 때만 URL을 만든다", () => {
		expect(buildGithubRunUrl({})).toBeUndefined();
		expect(
			buildGithubRunUrl({
				GITHUB_SERVER_URL: "https://github.com",
				GITHUB_REPOSITORY: "wintrover/wintrover.github.io",
				GITHUB_RUN_ID: "123",
			}),
		).toBe("https://github.com/wintrover/wintrover.github.io/actions/runs/123");
	});

	test("publishOneExitCode는 draft/dry-run 성공만 0으로 매핑한다", () => {
		const base = {
			platform: "devto" as const,
			postPath: "p.md",
			canonicalUrl: CANONICAL,
			method: "unknown" as const,
			attempts: 0,
			observedAt: "2026-06-01T00:00:00.000Z",
		};
		expect(publishOneExitCode({ ...base, state: "draft_verified" })).toBe(0);
		expect(publishOneExitCode({ ...base, state: "draft_found" })).toBe(0);
		expect(publishOneExitCode({ ...base, state: "dry_run" })).toBe(0);
		expect(publishOneExitCode({ ...base, state: "published_exists" })).toBe(1);
		expect(publishOneExitCode({ ...base, state: "published_verified" })).toBe(
			1,
		);
		expect(publishOneExitCode({ ...base, state: "already_published" })).toBe(1);
		expect(publishOneExitCode({ ...base, state: "failed" })).toBe(1);
		expect(publishOneExitCode({ ...base, state: "unknown" })).toBe(1);
		expect(publishOneExitCode({ ...base, state: "ambiguous" })).toBe(1);
	});

	test("buildPublishOneSummary는 draft 상태와 관찰 플래그를 요약한다", () => {
		const summary = buildPublishOneSummary({
			platform: "devto",
			postPath: "src/posts/archright/2026-05-04-6.md",
			canonicalUrl: CANONICAL,
			state: "draft_verified",
			method: "created",
			id: 501,
			draftId: 501,
			slug: "publish-one-test",
			url: "https://dev.to/wintrover/publish-one-test",
			observedDraft: true,
			observedPublished: false,
			attempts: 1,
			observedAt: "2026-06-01T00:00:00.000Z",
			runUrl:
				"https://github.com/wintrover/wintrover.github.io/actions/runs/123",
		});
		expect(summary).toContain("## Publish One Result");
		expect(summary).toContain("- state: `draft_verified`");
		expect(summary).toContain("- method: `created`");
		expect(summary).toContain("- attempts: 1");
		expect(summary).toContain("- observed draft: true");
		expect(summary).toContain("- observed published: false");
		expect(summary).toContain("actions/runs/123");
	});
});

describe("LinkedIn auto-posting guard", () => {
	afterEach(() => {
		delete process.env.LINKEDIN_AUTOPOST_ENABLED;
	});

	test("기본 플랫폼은 devto 하나다", () => {
		expect(parsePlatforms()).toEqual(["devto"]);
	});

	test("LINKEDIN_AUTOPOST_ENABLED가 없으면 LinkedIn을 거부한다", () => {
		delete process.env.LINKEDIN_AUTOPOST_ENABLED;
		expect(isLinkedInAutoPostEnabled()).toBe(false);
		expect(() => parsePlatforms("linkedin")).toThrow(/disabled/);
	});

	test("명시적 true일 때만 LinkedIn을 허용한다", () => {
		process.env.LINKEDIN_AUTOPOST_ENABLED = "true";
		expect(isLinkedInAutoPostEnabled()).toBe(true);
		expect(parsePlatforms("linkedin")).toEqual(["linkedin"]);
	});
});

import { createVerify, generateKeyPairSync } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
	type AppTokenDeps,
	type FetchLike,
	resolveConfigDir,
	runCli,
} from "../scripts/app-token";

const FIXED_NOW = Date.UTC(2026, 9, 22, 3, 0, 0);
const FAKE_TOKEN = "ghs_fakeinstallationtokenvalue";
const EXPIRES_AT = "2026-10-22T04:00:00Z";
const APP_ID = 12345;
const INSTALLATION_ID = 67890;

const { privateKey: TEST_PRIVATE_KEY, publicKey: TEST_PUBLIC_KEY } =
	generateKeyPairSync("rsa", {
		modulusLength: 2048,
		privateKeyEncoding: { type: "pkcs8", format: "pem" },
		publicKeyEncoding: { type: "spki", format: "pem" },
	});

type RecordedCall = { url: string; init: RequestInit };

function fakeResponse(body: unknown, status = 200): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
		text: async () => JSON.stringify(body),
	} as unknown as Response;
}

function makeFetch(respond: (url: string, init: RequestInit) => Response) {
	const calls: RecordedCall[] = [];
	const fetchFn: FetchLike = async (url, init) => {
		const request = init ?? {};
		calls.push({ url, init: request });
		return respond(url, request);
	};
	return { fetchFn, calls };
}

function withConfigDir(
	options: { withKey?: boolean; withConfig?: boolean } = {},
): { dir: string; dispose: () => void } {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "app-token-test-"));
	if (options.withKey !== false) {
		fs.writeFileSync(path.join(dir, "app.pem"), TEST_PRIVATE_KEY, "utf-8");
	}
	if (options.withConfig !== false) {
		fs.writeFileSync(
			path.join(dir, "config.json"),
			JSON.stringify({ appId: APP_ID, installationId: INSTALLATION_ID }),
			"utf-8",
		);
	}
	return {
		dir,
		dispose: () => fs.rmSync(dir, { recursive: true, force: true }),
	};
}

function makeDeps(overrides: Partial<AppTokenDeps> = {}) {
	const stdoutChunks: string[] = [];
	const stderrChunks: string[] = [];
	const deps: AppTokenDeps = {
		env: {},
		now: () => FIXED_NOW,
		fetchFn: async () => fakeResponse({}),
		stdout: (chunk) => {
			stdoutChunks.push(chunk);
		},
		stderr: (chunk) => {
			stderrChunks.push(chunk);
		},
		homedir: () => "/home/tester",
		...overrides,
	};
	return {
		deps,
		stdout: () => stdoutChunks.join(""),
		stderr: () => stderrChunks.join(""),
	};
}

function bearerJwt(call: RecordedCall): string {
	const headers = call.init.headers as Record<string, string>;
	return headers.Authorization.replace("Bearer ", "");
}

function decodeSegment(segment: string): Record<string, unknown> {
	return JSON.parse(
		Buffer.from(segment, "base64url").toString("utf-8"),
	) as Record<string, unknown>;
}

describe("app-token 스크립트", () => {
	test("Given app 설정 When 토큰을 민팅 Then JWT는 RS256 3절 구조로 서명된다", async () => {
		const { fetchFn, calls } = makeFetch(() =>
			fakeResponse({ token: FAKE_TOKEN, expires_at: EXPIRES_AT }, 201),
		);
		const config = withConfigDir();
		try {
			const { deps } = makeDeps({
				env: { WINTROVER_APP_CONFIG: config.dir },
				fetchFn,
			});
			expect(await runCli([], deps)).toBe(0);
			expect(calls).toHaveLength(1);

			const jwt = bearerJwt(calls[0]);
			const segments = jwt.split(".");
			expect(segments).toHaveLength(3);
			for (const segment of segments) {
				expect(segment).toMatch(/^[A-Za-z0-9_-]+$/);
			}

			const header = decodeSegment(segments[0]);
			expect(header.alg).toBe("RS256");
			expect(header.typ).toBe("JWT");

			const claims = decodeSegment(segments[1]);
			const nowSeconds = Math.floor(FIXED_NOW / 1000);
			expect(claims.iss).toBe(APP_ID);
			expect(claims.iat).toBe(nowSeconds - 60);
			expect(claims.exp).toBe(nowSeconds + 9 * 60);
			expect((claims.exp as number) - (claims.iat as number)).toBe(10 * 60);

			const verified = createVerify("RSA-SHA256")
				.update(`${segments[0]}.${segments[1]}`)
				.verify(TEST_PUBLIC_KEY, Buffer.from(segments[2], "base64url"));
			expect(verified).toBe(true);
		} finally {
			config.dispose();
		}
	});

	test("Given 정상 민팅 When 표준출력을 수집 Then 토큰 한 줄 외에는 아무것도 없다", async () => {
		const { fetchFn } = makeFetch(() =>
			fakeResponse({ token: FAKE_TOKEN, expires_at: EXPIRES_AT }, 201),
		);
		const config = withConfigDir();
		try {
			const { deps, stdout, stderr } = makeDeps({
				env: { WINTROVER_APP_CONFIG: config.dir },
				fetchFn,
			});
			expect(await runCli([], deps)).toBe(0);

			expect(stdout().trim()).toBe(FAKE_TOKEN);
			expect(
				stdout()
					.split("\n")
					.filter((line) => line.length > 0),
			).toHaveLength(1);
			expect(stdout()).not.toContain("OK");
			expect(stdout()).not.toContain("expires");
			expect(stdout()).not.toContain("Bearer");
			expect(stdout()).not.toContain("eyJ");

			expect(stderr()).toContain("OK");
			expect(stderr()).toContain(EXPIRES_AT);
		} finally {
			config.dispose();
		}
	});

	test("Given 개인키 파일 없음 When 토큰을 민팅 Then 종료 코드 1과 빈 표준출력이다", async () => {
		const { fetchFn, calls } = makeFetch(() =>
			fakeResponse({ token: FAKE_TOKEN, expires_at: EXPIRES_AT }, 201),
		);
		const config = withConfigDir({ withKey: false });
		try {
			const { deps, stdout, stderr } = makeDeps({
				env: { WINTROVER_APP_CONFIG: config.dir },
				fetchFn,
			});
			expect(await runCli([], deps)).toBe(1);
			expect(stdout()).toBe("");
			expect(stderr()).toContain("missing or unreadable");
			expect(calls).toHaveLength(0);
		} finally {
			config.dispose();
		}
	});

	test("Given 설정 디렉터리 없음 When 토큰을 민팅 Then 종료 코드 1과 빈 표준출력이다", async () => {
		const { fetchFn, calls } = makeFetch(() =>
			fakeResponse({ token: FAKE_TOKEN, expires_at: EXPIRES_AT }, 201),
		);
		const missing = path.join(os.tmpdir(), "app-token-test-missing-dir");
		const { deps, stdout, stderr } = makeDeps({
			env: { WINTROVER_APP_CONFIG: missing },
			fetchFn,
		});
		expect(await runCli([], deps)).toBe(1);
		expect(stdout()).toBe("");
		expect(stderr()).toContain("missing or unreadable");
		expect(calls).toHaveLength(0);
	});

	test("Given 잘못된 config.json When 토큰을 민팅 Then 종료 코드 1과 빈 표준출력이다", async () => {
		const { fetchFn } = makeFetch(() =>
			fakeResponse({ token: FAKE_TOKEN, expires_at: EXPIRES_AT }, 201),
		);
		const config = withConfigDir();
		try {
			fs.writeFileSync(
				path.join(config.dir, "config.json"),
				JSON.stringify({ appId: "not-a-number" }),
				"utf-8",
			);
			const { deps, stdout, stderr } = makeDeps({
				env: { WINTROVER_APP_CONFIG: config.dir },
				fetchFn,
			});
			expect(await runCli([], deps)).toBe(1);
			expect(stdout()).toBe("");
			expect(stderr()).toContain("numeric appId and installationId");
		} finally {
			config.dispose();
		}
	});

	test("Given GitHub 거부 When 진단을 수집 Then 비밀키와 토큰이 새지 않는다", async () => {
		const { fetchFn, calls } = makeFetch((_url, init) => {
			const headers = init.headers as Record<string, string>;
			const jwt = headers.Authorization.replace("Bearer ", "");
			return fakeResponse(
				{
					message: `Bad credentials: ${jwt}`,
					token: FAKE_TOKEN,
				},
				401,
			);
		});
		const config = withConfigDir();
		try {
			const { deps, stdout, stderr } = makeDeps({
				env: { WINTROVER_APP_CONFIG: config.dir },
				fetchFn,
			});
			expect(await runCli([], deps)).toBe(1);

			const jwt = bearerJwt(calls[0]);
			const diagnostic = stderr();
			expect(stdout()).toBe("");
			expect(diagnostic).toContain("401");
			expect(diagnostic).not.toContain("PRIVATE KEY");
			expect(diagnostic).not.toContain(TEST_PRIVATE_KEY);
			expect(diagnostic).not.toContain(jwt);
			expect(diagnostic).not.toContain(jwt.split(".").slice(0, 2).join("."));
			expect(diagnostic).not.toContain(FAKE_TOKEN);
		} finally {
			config.dispose();
		}
	});

	test("Given 토큰 민팅 When 요청을 관측 Then 저장소 하향 스코프와 Bearer 헤더를 사용한다", async () => {
		const { fetchFn, calls } = makeFetch(() =>
			fakeResponse({ token: FAKE_TOKEN, expires_at: EXPIRES_AT }, 201),
		);
		const config = withConfigDir();
		try {
			const { deps } = makeDeps({
				env: { WINTROVER_APP_CONFIG: config.dir },
				fetchFn,
			});
			expect(await runCli([], deps)).toBe(0);
			expect(calls).toHaveLength(1);

			const call = calls[0];
			expect(call.url).toBe(
				`https://api.github.com/app/installations/${INSTALLATION_ID}/access_tokens`,
			);
			expect(call.init.method).toBe("POST");

			const headers = call.init.headers as Record<string, string>;
			expect(headers.Authorization.startsWith("Bearer eyJ")).toBe(true);
			expect(headers.Accept).toBe("application/vnd.github+json");
			expect(headers["X-GitHub-Api-Version"]).toBe("2022-11-28");

			const body = JSON.parse(String(call.init.body)) as {
				repositories: string[];
			};
			expect(body).toEqual({ repositories: ["wintrover.github.io"] });
		} finally {
			config.dispose();
		}
	});

	test("Given --check When 실행 Then 토큰을 만들지 않고 만료 계산만 출력한다", async () => {
		const { fetchFn, calls } = makeFetch(() =>
			fakeResponse({ token: FAKE_TOKEN, expires_at: EXPIRES_AT }, 201),
		);
		const config = withConfigDir();
		try {
			const { deps, stdout, stderr } = makeDeps({
				env: { WINTROVER_APP_CONFIG: config.dir },
				fetchFn,
			});
			expect(await runCli(["--check"], deps)).toBe(0);
			expect(calls).toHaveLength(0);
			expect(stdout()).toBe("");
			expect(stderr()).toContain("CHECK OK");
			expect(stderr()).toContain("jwt_expires_at=");
			expect(stderr()).toContain("2026-10-22T03:09:00.000Z");
		} finally {
			config.dispose();
		}
	});

	test("Given 알 수 없는 인자 When 실행 Then 종료 코드 1과 빈 표준출력이다", async () => {
		const { fetchFn, calls } = makeFetch(() =>
			fakeResponse({ token: FAKE_TOKEN, expires_at: EXPIRES_AT }, 201),
		);
		const config = withConfigDir();
		try {
			const { deps, stdout, stderr } = makeDeps({
				env: { WINTROVER_APP_CONFIG: config.dir },
				fetchFn,
			});
			expect(await runCli(["--mint-everything"], deps)).toBe(1);
			expect(stdout()).toBe("");
			expect(stderr()).toContain("unknown argument");
			expect(calls).toHaveLength(0);
		} finally {
			config.dispose();
		}
	});
});

describe("설정 경로 해석", () => {
	test("Given 환경 변수 미설정 Then 기본 경로가 홈 아래에 있다", () => {
		expect(resolveConfigDir({}, () => "/home/tester")).toBe(
			"/home/tester/.config/wintrover-automation",
		);
	});

	test("Given 환경 변수 설정 Then 해당 경로를 사용한다", () => {
		expect(
			resolveConfigDir(
				{ WINTROVER_APP_CONFIG: "/srv/app" },
				() => "/home/tester",
			),
		).toBe("/srv/app");
	});

	test("Given 틸드 prefix Then 홈 기준으로 확장한다", () => {
		expect(
			resolveConfigDir(
				{ WINTROVER_APP_CONFIG: "~/keys" },
				() => "/home/tester",
			),
		).toBe("/home/tester/keys");
	});
});

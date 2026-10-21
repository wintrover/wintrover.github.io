import { createSign } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CONFIG_DIR_NAME = "wintrover-automation";
const KEY_FILE_NAME = "app.pem";
const CONFIG_FILE_NAME = "config.json";
const TARGET_REPOSITORY = "wintrover.github.io";
const API_ROOT = "https://api.github.com";
const API_VERSION = "2022-11-28";
const JWT_CLOCK_SKEW_SECONDS = 60;
const JWT_LIFETIME_SECONDS = 9 * 60;
const TOKEN_LIFETIME_SECONDS = 60 * 60;
const REDACTED = "[REDACTED]";
const MIN_SECRET_LENGTH = 8;
const MAX_DIAGNOSTIC_LENGTH = 400;
const JWT_PATTERN =
	/eyJ[A-Za-z0-9_-]{4,}(?:\.[A-Za-z0-9_-]{4,}){1,2}(?:\.[A-Za-z0-9_-]*)?/g;

export type AppConfig = {
	appId: number;
	installationId: number;
};

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type AppTokenDeps = {
	env: NodeJS.ProcessEnv;
	now: () => number;
	fetchFn: FetchLike;
	stdout: (chunk: string) => void;
	stderr: (chunk: string) => void;
	homedir: () => string;
};

export class AppTokenError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function toPositiveInteger(value: unknown): number | null {
	if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
		return value;
	}
	if (typeof value === "string" && /^\d+$/.test(value.trim())) {
		const parsed = Number.parseInt(value.trim(), 10);
		if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
	}
	return null;
}

function redact(text: string, secrets: string[]): string {
	let output = text;
	for (const secret of secrets) {
		if (!secret || secret.length < MIN_SECRET_LENGTH) continue;
		output = output.split(secret).join(REDACTED);
	}
	return output;
}

function sanitizeDiagnostic(text: string, secrets: string[]): string {
	const scrubbed = redact(text, secrets).replace(JWT_PATTERN, REDACTED);
	return scrubbed.slice(0, MAX_DIAGNOSTIC_LENGTH);
}

function privateKeyBody(privateKey: string): string {
	const match = privateKey.match(
		/-----BEGIN [^-]+-----\s*([\s\S]*?)\s*-----END [^-]+-----/,
	);
	return match ? match[1] : "";
}

export function resolveConfigDir(
	env: NodeJS.ProcessEnv,
	homedir: () => string,
): string {
	const raw = (env.WINTROVER_APP_CONFIG ?? "").trim();
	if (!raw) {
		return path.join(homedir(), ".config", CONFIG_DIR_NAME);
	}
	if (raw === "~") return homedir();
	if (raw.startsWith("~/")) return path.join(homedir(), raw.slice(2));
	return path.resolve(raw);
}

export function readAppConfig(configDir: string): AppConfig {
	const configPath = path.join(configDir, CONFIG_FILE_NAME);
	let raw: string;
	try {
		raw = fs.readFileSync(configPath, "utf-8");
	} catch {
		throw new AppTokenError(
			`config file is missing or unreadable: ${configPath}`,
		);
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new AppTokenError(`config file is not valid JSON: ${configPath}`);
	}
	if (!isRecord(parsed)) {
		throw new AppTokenError(
			`config file must contain a JSON object: ${configPath}`,
		);
	}
	const appId = toPositiveInteger(parsed.appId);
	const installationId = toPositiveInteger(parsed.installationId);
	if (appId === null || installationId === null) {
		throw new AppTokenError(
			`config file must define numeric appId and installationId: ${configPath}`,
		);
	}
	return { appId, installationId };
}

export function readPrivateKey(configDir: string): string {
	const keyPath = path.join(configDir, KEY_FILE_NAME);
	let raw: string;
	try {
		raw = fs.readFileSync(keyPath, "utf-8");
	} catch {
		throw new AppTokenError(`private key is missing or unreadable: ${keyPath}`);
	}
	if (!raw.includes("PRIVATE KEY")) {
		throw new AppTokenError(
			`private key file does not contain a PEM private key: ${keyPath}`,
		);
	}
	return raw;
}

export function base64UrlEncode(input: Buffer | string): string {
	return Buffer.from(input).toString("base64url");
}

export function jwtExpirySeconds(now: number): number {
	return Math.floor(now / 1000) + JWT_LIFETIME_SECONDS;
}

export function createAppJwt(options: {
	appId: number;
	privateKey: string;
	now: number;
}): string {
	const header = { alg: "RS256", typ: "JWT" };
	const issuedAt = Math.floor(options.now / 1000) - JWT_CLOCK_SKEW_SECONDS;
	const claims = {
		iat: issuedAt,
		exp: issuedAt + JWT_CLOCK_SKEW_SECONDS + JWT_LIFETIME_SECONDS,
		iss: options.appId,
	};
	const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
		JSON.stringify(claims),
	)}`;
	const signer = createSign("RSA-SHA256");
	signer.update(signingInput);
	signer.end();
	const signature = signer.sign(options.privateKey);
	return `${signingInput}.${base64UrlEncode(signature)}`;
}

async function readJsonSafely(response: Response): Promise<unknown> {
	try {
		return (await response.json()) as unknown;
	} catch {
		return null;
	}
}

function extractMessage(payload: unknown): string | null {
	if (!isRecord(payload)) return null;
	const message = payload.message;
	if (typeof message !== "string" || !message.trim()) return null;
	return message;
}

function extractToken(payload: unknown): string | null {
	if (!isRecord(payload)) return null;
	const token = payload.token;
	if (typeof token !== "string" || !token.trim()) return null;
	return token;
}

function extractExpiry(payload: unknown, now: number): string {
	if (isRecord(payload) && typeof payload.expires_at === "string") {
		return payload.expires_at;
	}
	return new Date(now + TOKEN_LIFETIME_SECONDS * 1000).toISOString();
}

function describeError(error: unknown): string {
	if (error instanceof Error) return error.message;
	try {
		return String(error);
	} catch {
		return "unknown error";
	}
}

export async function mintInstallationToken(options: {
	config: AppConfig;
	privateKey: string;
	now: number;
	fetchFn: FetchLike;
}): Promise<{ token: string; expiresAt: string }> {
	const jwt = createAppJwt({
		appId: options.config.appId,
		privateKey: options.privateKey,
		now: options.now,
	});
	const url = `${API_ROOT}/app/installations/${options.config.installationId}/access_tokens`;
	let response: Response;
	try {
		response = await options.fetchFn(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${jwt}`,
				Accept: "application/vnd.github+json",
				"X-GitHub-Api-Version": API_VERSION,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ repositories: [TARGET_REPOSITORY] }),
		});
	} catch (error) {
		throw new AppTokenError(
			sanitizeDiagnostic(`github request failed: ${describeError(error)}`, [
				jwt,
			]),
		);
	}
	const payload = await readJsonSafely(response);
	if (!response.ok) {
		const detail = extractMessage(payload);
		const echoedToken = extractToken(payload);
		throw new AppTokenError(
			sanitizeDiagnostic(
				`github rejected the installation token request (status ${response.status})${
					detail ? `: ${detail}` : ""
				}`,
				[jwt, echoedToken ?? ""],
			),
		);
	}
	const token = extractToken(payload);
	if (!token) {
		throw new AppTokenError(
			sanitizeDiagnostic(
				"github response did not contain an installation token",
				[jwt],
			),
		);
	}
	return { token, expiresAt: extractExpiry(payload, options.now) };
}

function parseArgs(argv: string[]): { checkOnly: boolean } {
	const unknown = argv.filter((arg) => arg !== "--check");
	if (unknown.length > 0) {
		throw new AppTokenError(`unknown argument: ${unknown[0]}`);
	}
	return { checkOnly: argv.includes("--check") };
}

export async function runCli(
	argv: string[],
	deps: AppTokenDeps,
): Promise<number> {
	let privateKey = "";
	try {
		const { checkOnly } = parseArgs(argv);
		const configDir = resolveConfigDir(deps.env, deps.homedir);
		const config = readAppConfig(configDir);
		privateKey = readPrivateKey(configDir);
		const now = deps.now();
		if (checkOnly) {
			const expiry = new Date(jwtExpirySeconds(now) * 1000).toISOString();
			deps.stderr(
				`[app-token] CHECK OK config=${configDir} appId=${config.appId} installationId=${config.installationId} jwt_expires_at=${expiry} token_ttl_seconds=${TOKEN_LIFETIME_SECONDS}\n`,
			);
			return 0;
		}
		const minted = await mintInstallationToken({
			config,
			privateKey,
			now,
			fetchFn: deps.fetchFn,
		});
		deps.stdout(`${minted.token}\n`);
		deps.stderr(`[app-token] OK expires_at=${minted.expiresAt}\n`);
		return 0;
	} catch (error) {
		const message = sanitizeDiagnostic(describeError(error), [
			privateKey,
			privateKeyBody(privateKey),
		]);
		deps.stderr(`[app-token] FAIL ${message}\n`);
		return 1;
	}
}

function defaultDeps(): AppTokenDeps {
	return {
		env: process.env,
		now: () => Date.now(),
		fetchFn: (url, init) => fetch(url, init),
		stdout: (chunk) => process.stdout.write(chunk),
		stderr: (chunk) => process.stderr.write(chunk),
		homedir: () => os.homedir(),
	};
}

if (process.argv[1] && path.basename(process.argv[1]) === "app-token.ts") {
	runCli(process.argv.slice(2), defaultDeps()).then(
		(code) => {
			if (code !== 0) process.exit(code);
		},
		(error) => {
			const message = sanitizeDiagnostic(describeError(error), []);
			process.stderr.write(`[app-token] FAIL ${message}\n`);
			process.exit(1);
		},
	);
}

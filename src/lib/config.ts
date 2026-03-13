export function getBaseUrl() {
	const withTrailingSlash = (s: string) => (s.endsWith("/") ? s : `${s}/`);

	const fromGlobal = (globalThis as any).__WINTR_BASE_URL__;
	if (typeof fromGlobal === "string" && fromGlobal.length > 0)
		return withTrailingSlash(fromGlobal);

	const envOverride = (globalThis as any).__WINTR_ENV_BASE_URL__;
	if (typeof envOverride === "string" && envOverride.length > 0)
		return withTrailingSlash(envOverride);

	const baseFromProcess = (globalThis as any).process?.env?.BASE_URL;
	if (typeof baseFromProcess === "string" && baseFromProcess.length > 0)
		return withTrailingSlash(baseFromProcess);

	const hasGlobalMetaEnv = Object.hasOwn(
		globalThis as any,
		"__WINTR_IMPORT_META_ENV__",
	);
	const metaEnv = hasGlobalMetaEnv
		? (globalThis as any).__WINTR_IMPORT_META_ENV__
		: (import.meta as any).env;
	const baseFromEnv = metaEnv?.BASE_URL;
	if (typeof baseFromEnv === "string" && baseFromEnv.length > 0)
		return withTrailingSlash(baseFromEnv);

	return withTrailingSlash(import.meta.env.BASE_URL ?? "/");
}

const baseUrl = getBaseUrl();

export const siteOrigin = "https://wintrover.github.io";
export const defaultOgImage = `${siteOrigin}/images/profile.png`;

export function getRuntimeOrigin() {
	if (typeof window === "undefined") return siteOrigin;
	return import.meta.env.PROD ? siteOrigin : window.location.origin;
}

export const siteConfig = {
	name: "wintrover",
	description: "Product Engineer & Builder",
	avatar: `${baseUrl}images/profile.png`,
	baseUrl,
	origin: siteOrigin,
	defaultOgImage,
	social: {
		email: "wintrover@gmail.com",
		github: "wintrover",
		instagram: "wintrover",
		linkedin: "suhyok-yun-1934b713a",
	},
};

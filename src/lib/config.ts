import type { Post } from "./postLoader";

type RuntimeEnv = {
	BASE_URL?: unknown;
};

type WintrGlobal = typeof globalThis & {
	__WINTR_BASE_URL__?: unknown;
	__WINTR_ENV_BASE_URL__?: unknown;
	__WINTR_IMPORT_META_ENV__?: RuntimeEnv;
	process?: {
		env?: RuntimeEnv;
	};
};

type ImportMetaWithEnv = ImportMeta & {
	env?: RuntimeEnv;
};

type SupportedLocale = "ko" | "en";

const brandProfile = {
	role: {
		ko: "사고 궤적 아키텍트",
		en: "Thought Trajectory Architect",
	},
	blogTitle: {
		ko: "wintrover - 사고 궤적 아키텍트",
		en: "wintrover - Thought Trajectory Architect",
	},
	blogDescription: {
		ko: "결과물 뒤에 숨겨진 의사결정의 궤적을 설계하는 사고 궤적 아키텍트의 블로그.",
		en: "A Thought Trajectory Architect's blog on designing decision trajectories behind AI products.",
	},
	buildDescription: {
		ko: "결과물 뒤에 숨겨진 의사결정의 궤적을 설계하는 사고 궤적 아키텍트의 블로그와 이력서.",
		en: "Blog and resume of a Thought Trajectory Architect who designs decision trajectories behind AI products.",
	},
	ogImageAlt: {
		ko: "wintrover 프로필 이미지",
		en: "wintrover profile image",
	},
} as const;

export function getBaseUrl() {
	const withTrailingSlash = (s: string) => (s.endsWith("/") ? s : `${s}/`);
	const globals = globalThis as WintrGlobal;

	const fromGlobal = globals.__WINTR_BASE_URL__;
	if (typeof fromGlobal === "string" && fromGlobal.length > 0)
		return withTrailingSlash(fromGlobal);

	const envOverride = globals.__WINTR_ENV_BASE_URL__;
	if (typeof envOverride === "string" && envOverride.length > 0)
		return withTrailingSlash(envOverride);

	const baseFromProcess = globals.process?.env?.BASE_URL;
	if (typeof baseFromProcess === "string" && baseFromProcess.length > 0)
		return withTrailingSlash(baseFromProcess);

	const hasGlobalMetaEnv = Object.hasOwn(globals, "__WINTR_IMPORT_META_ENV__");
	const metaEnv = hasGlobalMetaEnv
		? globals.__WINTR_IMPORT_META_ENV__
		: (import.meta as ImportMetaWithEnv).env;
	const baseFromEnv = metaEnv?.BASE_URL;
	if (typeof baseFromEnv === "string" && baseFromEnv.length > 0)
		return withTrailingSlash(baseFromEnv);

	return withTrailingSlash("/");
}

const baseUrl = getBaseUrl();

export const siteOrigin = "https://wintrover.github.io";
export const defaultOgImage = `${siteOrigin}/images/profile.png`;
export const blogDefaultSeo = {
	title: brandProfile.blogTitle.en,
	description: {
		ko: brandProfile.blogDescription.ko,
		en: brandProfile.blogDescription.en,
	},
};

export function getBlogBuildMeta(locale: SupportedLocale) {
	return {
		metaDescription: brandProfile.buildDescription[locale],
		ogTitle: brandProfile.blogTitle[locale],
		ogDescription: brandProfile.buildDescription[locale],
		ogImageAlt: brandProfile.ogImageAlt[locale],
	};
}

export function buildBlogListSeoUrl(args: {
	isBrowser: boolean;
	currentHref: string | null;
	resolvedLocale: "ko" | "en";
}) {
	const { isBrowser, currentHref, resolvedLocale } = args;
	if (isBrowser && currentHref) return currentHref;
	const localePrefix = resolvedLocale === "ko" ? "/ko" : "";
	return `${getRuntimeOrigin()}${localePrefix}/`;
}

export function buildPostDetailSeo(args: {
	post: Post | null;
	loading: boolean;
	slug: string;
	resolvedLocale: "ko" | "en";
}) {
	const { post, loading, slug, resolvedLocale } = args;
	const origin = getRuntimeOrigin();
	const localePrefix = resolvedLocale === "ko" ? "/ko" : "";
	const localeRoot = `${origin}${localePrefix}/`;

	if (post) {
		const seoTitle = `${post.title} - wintrover`;
		const seoDescription = post.excerpt || post.title;
		const canonicalUrl = slug
			? `${origin}${localePrefix}/post/${slug}/`
			: localeRoot;
		return {
			seoTitle,
			seoDescription,
			canonicalUrl,
			structuredData: JSON.stringify({
				"@context": "https://schema.org",
				"@type": "BlogPosting",
				headline: post.title,
				image: [defaultOgImage],
				datePublished: post.date,
				dateModified: post.date,
				author: {
					"@type": "Person",
					name: "wintrover",
					url: `${origin}/`,
				},
				description: seoDescription,
				mainEntityOfPage: canonicalUrl,
			}),
		};
	}

	if (!loading) {
		return {
			seoTitle: "Post not found - wintrover",
			seoDescription:
				"The post you're looking for doesn't exist or has been moved.",
			canonicalUrl: localeRoot,
			structuredData: "",
		};
	}

	return {
		seoTitle: "Loading post - wintrover",
		seoDescription: "",
		canonicalUrl: localeRoot,
		structuredData: "",
	};
}

export function getRuntimeOrigin() {
	if (typeof window === "undefined") return siteOrigin;
	return import.meta.env.PROD ? siteOrigin : window.location.origin;
}

export const siteConfig = {
	name: "wintrover",
	description: brandProfile.role.en,
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

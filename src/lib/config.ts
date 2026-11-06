import { localePrefix } from "./locale";
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
		ko: "무결성 증명 엔지니어",
		en: "Integrity Proof Engineer",
	},
	blogTitle: {
		ko: "Axiom - 무결성 증명 엔지니어",
		en: "Axiom - Integrity Proof Engineer",
	},
	blogDescription: {
		ko: "AI 생성 소프트웨어의 명시적 사양과 주장을 검증하고, 그 결과를 기계적으로 재현 가능한 증거로 남기는 무결성 증명 엔지니어의 블로그.",
		en: "An Integrity Proof Engineer's blog on verifying the explicit specifications and claims of AI-generated software as machine-reproducible evidence.",
	},
	buildDescription: {
		ko: "AI 생성 소프트웨어의 명시적 사양과 주장을 검증하고, 그 결과를 기계적으로 재현 가능한 증거로 남기는 무결성 증명 엔지니어의 블로그와 이력서.",
		en: "Blog and resume of an Integrity Proof Engineer who verifies the explicit specifications and claims of AI-generated software and records the results as machine-reproducible evidence.",
	},
	ogImageAlt: {
		ko: "Axiom 프로필 이미지",
		en: "Axiom profile image",
	},
} as const;

const notFoundProfile = {
	page: {
		title: {
			ko: "페이지를 찾을 수 없습니다",
			en: "Page not found",
		},
		description: {
			ko: "찾으시는 페이지가 없거나 이동되었습니다.",
			en: "The page you're looking for doesn't exist or has been moved.",
		},
	},
	post: {
		title: {
			ko: "포스트를 찾을 수 없습니다",
			en: "Post not found",
		},
		description: {
			ko: "찾으시는 포스트가 없거나 이동되었습니다.",
			en: "The post you're looking for doesn't exist or has been moved.",
		},
	},
	homeLink: {
		ko: "홈으로 돌아가기",
		en: "Go back to home",
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

export function getNotFoundCopy(args: {
	scope: "page" | "post";
	resolvedLocale: SupportedLocale;
}) {
	const { scope, resolvedLocale } = args;
	return {
		title: notFoundProfile[scope].title[resolvedLocale],
		description: notFoundProfile[scope].description[resolvedLocale],
		homeLink: notFoundProfile.homeLink[resolvedLocale],
	};
}

export function buildNotFoundSeoUrl(resolvedLocale: SupportedLocale) {
	return `${getRuntimeOrigin()}${localePrefix(resolvedLocale)}/`;
}

export function buildBlogListSeoUrl(args: {
	isBrowser: boolean;
	currentHref: string | null;
	resolvedLocale: "ko" | "en";
}) {
	const { isBrowser, currentHref, resolvedLocale } = args;
	if (isBrowser && currentHref) return currentHref;
	return `${getRuntimeOrigin()}${localePrefix(resolvedLocale)}/`;
}

export function buildPostDetailSeo(args: {
	post: Post | null;
	loading: boolean;
	slug: string;
	resolvedLocale: "ko" | "en";
}) {
	const { post, loading, slug, resolvedLocale } = args;
	const origin = getRuntimeOrigin();
	const localePathPrefix = localePrefix(resolvedLocale);
	const localeRoot = `${origin}${localePathPrefix}/`;

	if (post) {
		const seoTitle = post.title;
		const seoDescription = post.excerpt || post.title;
		const canonicalUrl = slug
			? `${origin}${localePathPrefix}/post/${slug}/`
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
		const copy = getNotFoundCopy({ scope: "post", resolvedLocale });
		return {
			seoTitle: copy.title,
			seoDescription: copy.description,
			canonicalUrl: localeRoot,
			structuredData: "",
		};
	}

	return {
		seoTitle: "Post",
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
	name: "Axiom",
	description: brandProfile.role.en,
	avatar: `${baseUrl}images/profile.png`,
	baseUrl,
	origin: siteOrigin,
	defaultOgImage,
	social: {
		email: "wintrover@gmail.com",
		github: "wintrover",
		linkedin: "suhyok-yun-1934b713a",
	},
};

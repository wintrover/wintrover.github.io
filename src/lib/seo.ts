import {
	buildPostDetailSeo,
	defaultOgImage,
	getBlogBuildMeta,
	getNotFoundCopy,
	getRuntimeOrigin,
} from "./config";
import { type Locale, localeBase } from "./locale";
import type { Post } from "./postLoader";

type SeoAlternates = {
	ko: string;
	en: string;
	xDefault: string;
};

type SeoPayload = {
	title: string;
	canonical: string;
	description: string;
	ogTitle: string;
	ogDescription: string;
	ogType: string;
	ogUrl: string;
	ogImage: string;
	ogImageAlt: string;
	ogSiteName: string;
	keywords?: string;
	structuredData?: string;
	alternates: SeoAlternates;
};

const structuredDataSelector =
	'script[type="application/ld+json"][data-seo-owner="spa"]';

function keepFirst<T extends Element>(elements: T[]): T | null {
	const [first, ...rest] = elements;
	for (const element of rest) {
		element.remove();
	}
	return first ?? null;
}

function ensureMeta(attribute: "name" | "property", key: string) {
	const existing = keepFirst([
		...document.querySelectorAll<HTMLMetaElement>(
			`meta[${attribute}="${key}"]`,
		),
	]);
	if (existing) return existing;

	const meta = document.createElement("meta");
	meta.setAttribute(attribute, key);
	document.head.appendChild(meta);
	return meta;
}

function setMeta(attribute: "name" | "property", key: string, content: string) {
	ensureMeta(attribute, key).setAttribute("content", content);
}

function removeMeta(attribute: "name" | "property", key: string) {
	for (const meta of document.querySelectorAll(`meta[${attribute}="${key}"]`)) {
		meta.remove();
	}
}

function ensureCanonical() {
	const existing = keepFirst([
		...document.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'),
	]);
	if (existing) return existing;

	const link = document.createElement("link");
	link.setAttribute("rel", "canonical");
	document.head.appendChild(link);
	return link;
}

function setAlternate(hreflang: string, href: string) {
	const selector = `link[rel="alternate"][hreflang="${hreflang}"]`;
	const existing = keepFirst([
		...document.querySelectorAll<HTMLLinkElement>(selector),
	]);
	if (existing) {
		existing.setAttribute("href", href);
		return;
	}

	const link = document.createElement("link");
	link.setAttribute("rel", "alternate");
	link.setAttribute("hreflang", hreflang);
	link.setAttribute("href", href);
	document.head.appendChild(link);
}

function setStructuredData(json: string | undefined) {
	const existing = keepFirst([
		...document.querySelectorAll<HTMLScriptElement>(structuredDataSelector),
	]);
	if (!json) {
		existing?.remove();
		return;
	}

	const script = existing ?? document.createElement("script");
	if (!existing) {
		script.setAttribute("type", "application/ld+json");
		script.setAttribute("data-seo-owner", "spa");
		document.head.appendChild(script);
	}
	script.textContent = json;
}

function homeAlternates(origin: string): SeoAlternates {
	return {
		ko: `${origin}/ko/`,
		en: `${origin}/`,
		xDefault: `${origin}/`,
	};
}

function localeBlogSeo(resolvedLocale: Locale) {
	const meta = getBlogBuildMeta(resolvedLocale);
	return {
		title: meta.ogTitle,
		description: meta.metaDescription,
		ogTitle: meta.ogTitle,
		ogDescription: meta.ogDescription,
		ogImage: defaultOgImage,
		ogImageAlt: meta.ogImageAlt,
	};
}

function applySeo(payload: SeoPayload) {
	if (typeof document === "undefined") return;

	document.title = payload.title;
	ensureCanonical().setAttribute("href", payload.canonical);
	setMeta("name", "description", payload.description);
	setMeta("property", "og:title", payload.ogTitle);
	setMeta("property", "og:description", payload.ogDescription);
	setMeta("property", "og:type", payload.ogType);
	setMeta("property", "og:url", payload.ogUrl);
	setMeta("property", "og:image", payload.ogImage);
	setMeta("property", "og:image:alt", payload.ogImageAlt);
	setMeta("property", "og:site_name", payload.ogSiteName);
	if (payload.keywords) {
		setMeta("name", "keywords", payload.keywords);
	} else {
		removeMeta("name", "keywords");
	}
	setAlternate("ko", payload.alternates.ko);
	setAlternate("en", payload.alternates.en);
	setAlternate("x-default", payload.alternates.xDefault);
	setStructuredData(payload.structuredData);
}

export function applyHomeSeo(resolvedLocale: Locale) {
	const origin = getRuntimeOrigin();
	const canonical = `${origin}${localeBase(resolvedLocale)}`;
	applySeo({
		...localeBlogSeo(resolvedLocale),
		canonical,
		ogType: "website",
		ogUrl: canonical,
		ogSiteName: "wintrover",
		alternates: homeAlternates(origin),
	});
}

export function applyNotFoundSeo(resolvedLocale: Locale) {
	const origin = getRuntimeOrigin();
	const copy = getNotFoundCopy({ scope: "page", resolvedLocale });
	const canonical = `${origin}${localeBase(resolvedLocale)}`;
	applySeo({
		...localeBlogSeo(resolvedLocale),
		title: copy.title,
		description: copy.description,
		canonical,
		ogType: "website",
		ogUrl: canonical,
		ogSiteName: "wintrover",
		alternates: homeAlternates(origin),
	});
}

export function applyBlogListSeo(args: {
	title: string;
	description: string;
	resolvedLocale: Locale;
}) {
	const origin = getRuntimeOrigin();
	const canonical = `${origin}${localeBase(args.resolvedLocale)}`;
	applySeo({
		title: args.title,
		description: args.description,
		canonical,
		ogTitle: args.title,
		ogDescription: args.description,
		ogType: "website",
		ogUrl: canonical,
		ogImage: defaultOgImage,
		ogImageAlt: args.title,
		ogSiteName: "Axiom",
		alternates: homeAlternates(origin),
	});
}

export function applyPostSeo(args: {
	post: Post | null;
	loading: boolean;
	slug: string;
	resolvedLocale: Locale;
}) {
	const seo = buildPostDetailSeo(args);
	applySeo({
		...localeBlogSeo(args.resolvedLocale),
		title: seo.seoTitle,
		description: seo.seoDescription,
		canonical: seo.canonicalUrl,
		ogTitle: seo.seoTitle,
		ogDescription: seo.seoDescription,
		ogType: args.post ? "article" : "website",
		ogUrl: seo.canonicalUrl,
		ogImageAlt: args.post?.title ?? seo.seoTitle,
		ogSiteName: "Axiom",
		structuredData: seo.structuredData,
		alternates: homeAlternates(getRuntimeOrigin()),
	});
}

export function applyResumeSeo(args: {
	canonical: string;
	title: string;
	description: string;
	keywords: string;
	ogTitle: string;
	ogDescription: string;
	ogType: string;
	imageAlt: string;
}) {
	const origin = getRuntimeOrigin();
	applySeo({
		title: args.title,
		description: args.description,
		canonical: args.canonical,
		ogTitle: args.ogTitle,
		ogDescription: args.ogDescription,
		ogType: args.ogType,
		ogUrl: args.canonical,
		ogImage: defaultOgImage,
		ogImageAlt: args.imageAlt,
		ogSiteName: "Axiom",
		keywords: args.keywords,
		alternates: {
			ko: `${origin}/ko/resume/`,
			en: `${origin}/resume/`,
			xDefault: `${origin}/`,
		},
	});
}

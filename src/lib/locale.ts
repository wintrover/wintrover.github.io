export type Locale = "ko" | "en";

export function parseLocaleFromPathname(pathname: string): Locale | null {
	const match = String(pathname).match(/^\/ko(\/|$)/);
	return match ? "ko" : null;
}

export function detectLocale(opts: {
	envLocale?: string;
	pathname?: string;
	navigatorLanguage?: string;
	defaultLocale?: Locale;
}): Locale {
	const { envLocale, pathname, navigatorLanguage, defaultLocale = "en" } = opts;

	if (envLocale === "ko" || envLocale === "en") return envLocale;

	const fromPath = pathname ? parseLocaleFromPathname(pathname) : null;
	if (fromPath) return fromPath;

	const nav = (navigatorLanguage ?? "").toLowerCase();
	return nav.startsWith("ko") ? "ko" : defaultLocale;
}

export function detectLocaleFromRuntime(pathname?: string): Locale {
	const resolvedPathname =
		pathname ??
		(typeof window !== "undefined" ? window.location.pathname : "/");
	const runtimeNavigatorLanguage =
		typeof navigator !== "undefined" ? navigator.language : undefined;
	return detectLocale({
		envLocale: import.meta.env.VITE_LOCALE,
		pathname: resolvedPathname,
		navigatorLanguage: runtimeNavigatorLanguage,
	});
}

export function localePrefix(locale: Locale) {
	return locale === "ko" ? "/ko" : "";
}

export function localeBase(locale: Locale) {
	return locale === "ko" ? "/ko/" : "/";
}

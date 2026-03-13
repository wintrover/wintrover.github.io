export type Locale = "ko" | "en";

export function parseLocaleFromPathname(pathname: string): Locale | null {
	const match = String(pathname).match(/^\/(ko|en)(\/|$)/);
	if (!match) return null;
	return match[1] as Locale;
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

export function localeBase(locale: Locale) {
	return locale === "ko" ? "/ko/" : "/";
}

import App from "./App.svelte";
import {
	detectLocale,
	localeBase,
	parseLocaleFromPathname,
} from "./lib/locale";

// Handle common browser/extension errors that are often uncatchable
if (typeof window !== "undefined") {
	if (import.meta.env.DEV) {
		const url = new URL(window.location.href);
		const path = url.pathname || "/";
		const localeFromPath = parseLocaleFromPathname(path);

		if (!localeFromPath) {
			const locale = detectLocale({
				envLocale: import.meta.env.VITE_LOCALE,
				pathname: path,
				navigatorLanguage: navigator.language,
			});
			const langBase = localeBase(locale);

			if (path === "/" || path === "/index.html") {
				window.location.replace(`${langBase}${url.search}${url.hash}`);
			} else {
				window.location.replace(`${langBase}#${path}${url.search}${url.hash}`);
			}
		} else {
			const langBase = localeBase(localeFromPath);
			const rest = path.slice(langBase.length - 1);

			if (
				(!url.hash || url.hash === "#") &&
				rest !== "/" &&
				rest !== "/index.html"
			) {
				window.history.replaceState({}, "", `${langBase}${url.search}#${rest}`);
			}
		}
	}
	window.addEventListener("error", (event) => {
		// Suppress or explain "Unchecked runtime.lastError"
		if (event.message?.includes("message port closed")) {
			console.warn(
				"💡 Browser/Extension Note: 'The message port closed before a response was received' is usually caused by a browser extension (like AdBlock or a Password Manager) and typically doesn't affect blog functionality.",
			);
		}
	});
}

if (typeof document !== "undefined") {
	const htmlLang = detectLocale({
		envLocale: import.meta.env.VITE_LOCALE,
		pathname: window.location.pathname,
		navigatorLanguage: navigator.language,
	});
	document.documentElement.lang = htmlLang;
	const canonical = document.querySelector('link[rel="canonical"]');
	const envLocale = import.meta.env.VITE_LOCALE;
	const locale =
		envLocale === "ko" || envLocale === "en"
			? envLocale
			: (parseLocaleFromPathname(window.location.pathname) ?? htmlLang);
	if (canonical instanceof HTMLLinkElement) {
		canonical.href = locale
			? `https://wintrover.github.io/${String(locale)}/`
			: "https://wintrover.github.io/";
	}
}

const target = document.getElementById("app");
let app;

if (target) {
	app = new App({
		target: target,
	});
}

export default app;

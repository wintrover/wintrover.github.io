import App from "./App.svelte";

// Handle common browser/extension errors that are often uncatchable
if (typeof window !== "undefined") {
	const env = (import.meta as any)?.env ?? {};
	if (env.DEV) {
		const url = new URL(window.location.href);
		const path = url.pathname || "/";
		const matchLangPrefix = path.match(/^\/(ko|en)(\/|$)/);
		const langBase = matchLangPrefix ? `/${matchLangPrefix[1]}/` : "/";
		const rest = matchLangPrefix ? path.slice(langBase.length - 1) : path;
		if (
			(!url.hash || url.hash === "#") &&
			rest !== "/" &&
			rest !== "/index.html"
		) {
			window.history.replaceState({}, "", `${langBase}${url.search}#${rest}`);
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
	const env = (import.meta as any)?.env ?? {};
	const htmlLang = env.VITE_HTML_LANG ?? env.VITE_LOCALE ?? "en";
	document.documentElement.lang = htmlLang;
	const canonical = document.querySelector('link[rel="canonical"]');
	const locale = env.VITE_LOCALE;
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

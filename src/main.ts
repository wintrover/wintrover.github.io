import { mount } from "svelte";
import App from "./App.svelte";
import { initAnalytics } from "./lib/analytics";
import { siteOrigin } from "./lib/config";
import {
	detectLocaleFromRuntime,
	localeBase,
	parseLocaleFromPathname,
} from "./lib/locale";
import { logWarn } from "./lib/log";

// Handle common browser/extension errors that are often uncatchable
if (typeof window !== "undefined") {
	if (import.meta.env.DEV) {
		const url = new URL(window.location.href);
		const path = url.pathname || "/";
		const localeFromPath = parseLocaleFromPathname(path);

		if (!localeFromPath) {
			const locale = detectLocaleFromRuntime(path);
			const langBase = localeBase(locale);

			if (locale === "ko") {
				if (path === "/" || path === "/index.html") {
					window.location.replace(`${langBase}${url.search}${url.hash}`);
				} else {
					window.location.replace(
						`${langBase}#${path}${url.search}${url.hash}`,
					);
				}
			} else if (path !== "/" && path !== "/index.html") {
				window.location.replace(`/${url.search}#${path}${url.hash}`);
			}
		} else {
			const rest = path.replace(/^\/ko(?=\/|$)/, "") || "/";
			if (
				(!url.hash || url.hash === "#") &&
				rest !== "/" &&
				rest !== "/index.html"
			) {
				window.history.replaceState({}, "", `/ko/${url.search}#${rest}`);
			}
		}
	}
	window.addEventListener("error", (event) => {
		if (event.message?.includes("message port closed")) {
			logWarn(
				"main",
				"'The message port closed before a response was received'는 보통 브라우저 확장 프로그램(AdBlock/Password Manager 등)에서 발생하며, 대개 블로그 기능에는 영향을 주지 않습니다.",
				{ message: event.message },
			);
		}
	});
}

if (typeof document !== "undefined") {
	const htmlLang = detectLocaleFromRuntime(window.location.pathname);
	document.documentElement.lang = htmlLang;
	const canonical = document.querySelector('link[rel="canonical"]');
	const envLocale = import.meta.env.VITE_LOCALE;
	const locale =
		envLocale === "ko" || envLocale === "en"
			? envLocale
			: (parseLocaleFromPathname(window.location.pathname) ?? htmlLang);
	if (canonical instanceof HTMLLinkElement) {
		canonical.href = `${siteOrigin}${localeBase(locale)}`;
	}
}

initAnalytics();

const target = document.getElementById("app");
let app;

if (target) {
	app = mount(App, { target });
}

export default app;

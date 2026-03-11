import { init, register } from "svelte-i18n";
import { browser } from "$app/environment";

export const defaultLocale = "ko";
const supportedLocales = ["ko", "en"];

const normalizeLocale = (value) => {
	if (typeof value !== "string") return "";
	const [primary] = value.toLowerCase().split("-");
	return primary;
};

export const resolveInitialLocale = () => {
	if (!browser) return defaultLocale;
	const normalized = normalizeLocale(window.navigator.language);
	return supportedLocales.includes(normalized) ? normalized : defaultLocale;
};

const registerLocale = (localeKey, loader) => {
	register(localeKey, async () => {
		try {
			return await loader();
		} catch (error) {
			console.error("[i18n] locale loader failed", {
				locale: localeKey,
				href: browser ? globalThis.location?.href : undefined,
				language: browser ? globalThis.navigator?.language : undefined,
				error,
			});
			throw error;
		}
	});
};

registerLocale("ko", async () => import("./locales/ko.json"));
registerLocale("en", async () => import("./locales/en.json"));

init({
	fallbackLocale: defaultLocale,
	initialLocale: resolveInitialLocale(),
});

export { _, isLoading, locale, waitLocale } from "svelte-i18n";

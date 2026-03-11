import { browser } from "$app/environment";
import {
	defaultLocale,
	locale,
	resolveInitialLocale,
	waitLocale,
} from "$lib/i18n";

export const load = async () => {
	if (browser) {
		try {
			locale.set(resolveInitialLocale());
		} catch (error) {
			console.error("[i18n] locale.set failed", {
				href: globalThis.location?.href,
				language: globalThis.navigator?.language,
				error,
			});
			locale.set(defaultLocale);
		}
	}

	try {
		await waitLocale();
	} catch (error) {
		console.error("[i18n] waitLocale failed", {
			href: browser ? globalThis.location?.href : undefined,
			language: browser ? globalThis.navigator?.language : undefined,
			error,
		});

		if (browser) {
			try {
				locale.set(defaultLocale);
				await waitLocale();
			} catch (fallbackError) {
				console.error("[i18n] waitLocale fallback failed", {
					href: globalThis.location?.href,
					error: fallbackError,
				});
			}
		}
	}
};

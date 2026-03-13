const baseUrl = import.meta.env.BASE_URL ?? "/";

export const siteOrigin = "https://wintrover.github.io";
export const defaultOgImage = `${siteOrigin}/images/profile.png`;

export function getRuntimeOrigin() {
	if (typeof window === "undefined") return siteOrigin;
	return import.meta.env.PROD ? siteOrigin : window.location.origin;
}

export const siteConfig = {
	name: "wintrover",
	description: "Fullstack AI Application Architect",
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

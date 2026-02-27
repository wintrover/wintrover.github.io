const isDev = import.meta.env.DEV;

export const giscusConfig = {
	repo: import.meta.env.VITE_GISCUS_REPO || "wintrover/blog",
	repoId: import.meta.env.VITE_GISCUS_REPO_ID || "R_kgDOQOClcw",
	category: import.meta.env.VITE_GISCUS_CATEGORY || "General",
	categoryId: import.meta.env.VITE_GISCUS_CATEGORY_ID || "DIC_kwDOQOClc84CxX8B",
	mapping: "pathname",
	strict: "0",
	reactionsEnabled: "0",
	emitMetadata: "0",
	inputPosition: "bottom",
	theme: "preferred_color_scheme",
	lang: "en",
	debug: isDev,
};

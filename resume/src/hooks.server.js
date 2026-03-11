export function handle({ event, resolve }) {
	const pathname = event.url?.pathname?.toLowerCase?.() ?? "";
	const match = pathname.match(/\/(ko|en)(\/|$)/);
	const lang = match ? match[1] : "ko";
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace("%lang%", lang),
	});
}

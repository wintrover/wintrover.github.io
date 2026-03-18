type GtagCommand = "js" | "config" | "event";
type Gtag = (
	command: GtagCommand,
	target: string | Date,
	params?: Record<string, unknown>,
) => void;

type LocationLike = {
	href: string;
	pathname: string;
	search: string;
	hash: string;
};

type AnalyticsWindow = Window & {
	dataLayer?: unknown[];
	gtag?: Gtag;
};

let initialized = false;
let lastPagePath = "";

export function resolveGaMeasurementId(raw: unknown) {
	if (typeof raw !== "string") return null;
	const value = raw.trim();
	if (!value) return null;
	return /^G-[A-Z0-9]+$/i.test(value) ? value : null;
}

export function resolvePagePath(
	location: Pick<LocationLike, "pathname" | "search" | "hash">,
) {
	const hash = String(location.hash || "");
	const hashRoute = hash.startsWith("#/") ? hash.slice(1) : "";
	const basePath = hashRoute || String(location.pathname || "/");
	const search = String(location.search || "");
	return `${basePath}${search}`;
}

function ensureGtag(win: AnalyticsWindow) {
	win.dataLayer = win.dataLayer || [];
	if (typeof win.gtag !== "function") {
		win.gtag = function (..._args: Parameters<Gtag>) {
			win.dataLayer?.push(arguments);
		} as unknown as Gtag;
	}
	return win.gtag;
}

function ensureGaScript(doc: Document, measurementId: string) {
	const existing = doc.querySelector<HTMLScriptElement>(
		`script[src*="googletagmanager.com/gtag/js?id=${measurementId}"]`,
	);
	if (existing) return;
	const script = doc.createElement("script");
	script.async = true;
	script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
	doc.head.appendChild(script);
}

function trackPageView(gtag: Gtag, location: LocationLike) {
	const pagePath = resolvePagePath(location);
	if (pagePath === lastPagePath) return;
	lastPagePath = pagePath;
	gtag("event", "page_view", {
		page_location: location.href,
		page_path: pagePath,
		page_title: typeof document !== "undefined" ? document.title : undefined,
	});
}

export function trackCurrentPageView() {
	if (typeof window === "undefined") return;
	const win = window as AnalyticsWindow;
	const gtag = ensureGtag(win);
	trackPageView(gtag, window.location);
}

export function startAnalytics(measurementId: string) {
	if (initialized) return;
	if (typeof window === "undefined" || typeof document === "undefined") return;

	const win = window as AnalyticsWindow;
	ensureGaScript(document, measurementId);
	const gtag = ensureGtag(win);

	gtag("js", new Date());
	gtag("config", measurementId, { send_page_view: false });
	trackCurrentPageView();

	const onRouteChange = () => {
		trackCurrentPageView();
	};
	window.addEventListener("hashchange", onRouteChange);
	window.addEventListener("popstate", onRouteChange);

	initialized = true;
}

export function initAnalytics() {
	const measurementId = resolveGaMeasurementId(
		import.meta.env.VITE_GA_MEASUREMENT_ID,
	);
	if (!measurementId) return;
	startAnalytics(measurementId);
}

export function resetAnalyticsState() {
	initialized = false;
	lastPagePath = "";
}

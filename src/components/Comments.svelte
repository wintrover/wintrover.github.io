<script lang="ts">
import { afterUpdate, onDestroy, onMount, tick } from "svelte";
import { giscusConfig } from "../lib/giscus-config";

// Use configuration or allow override via props
export let repo = giscusConfig.repo;
export let repoId = giscusConfig.repoId;
export let category = giscusConfig.category;
export let categoryId = giscusConfig.categoryId;
export let mapping = giscusConfig.mapping;
export let term = ""; // Used when mapping is 'specific'
export let strict = giscusConfig.strict;
export let reactionsEnabled = giscusConfig.reactionsEnabled;
export let emitMetadata = giscusConfig.emitMetadata;
export let inputPosition = giscusConfig.inputPosition;
export let theme = giscusConfig.theme;
export let lang = giscusConfig.lang;

let giscusLoaded = false;
let container;

// Use reactive statement since onMount seems unreliable in some test environments
$: if (container && !giscusLoaded) {
	loadGiscus();
}

let messageListenerAdded = false;
$: if (container && !messageListenerAdded) {
	window.addEventListener("message", handleMessage);
	messageListenerAdded = true;
}

// Cleanup using onDestroy
onDestroy(() => {
	if (messageListenerAdded) {
		window.removeEventListener("message", handleMessage);
		messageListenerAdded = false;
	}
});

function handleMessage(event: MessageEvent) {
	// Only listen to messages from Giscus
	if (event.origin !== "https://giscus.app") return;

	const { data } = event;
	if (!(typeof data === "object" && data.giscus)) return;

	const giscusData = data.giscus;

	// Handle specific error messages from Giscus (Advanced Usage)
	if ("error" in giscusData) {
		console.error("❌ Giscus Error:", giscusData.error);
		return;
	}

	// Log Giscus messages if debug is enabled
	if (giscusConfig.debug) {
		console.log("💬 Giscus Message:", giscusData);
	}
}

async function loadGiscus() {
	if (giscusLoaded) return;

	// Check if all required values are present
	if (!repo || !repoId || !categoryId) {
		console.error("❌ Missing required Giscus configuration:", {
			repo,
			repoId,
			category,
			categoryId,
			mapping,
			term,
		});
		return;
	}

	giscusLoaded = true;

	const script = document.createElement("script");
	script.src = "https://giscus.app/client.js";
	script.setAttribute("data-repo", repo);
	script.setAttribute("data-repo-id", repoId);
	script.setAttribute("data-category", category);
	script.setAttribute("data-category-id", categoryId);
	script.setAttribute("data-mapping", mapping);
	if (mapping === "specific" && term) {
		script.setAttribute("data-term", term);
	}
	script.setAttribute("data-strict", strict);
	script.setAttribute("data-reactions-enabled", reactionsEnabled);
	script.setAttribute("data-emit-metadata", emitMetadata);
	script.setAttribute("data-input-position", inputPosition);
	script.setAttribute("data-theme", theme);
	script.setAttribute("data-lang", lang);
	script.setAttribute("crossorigin", "anonymous");
	script.async = true;

	// script.onerror handling
	script.onerror = () => {
		console.error("❌ Failed to load Giscus script");
		giscusLoaded = false;
	};

	if (container) {
		container.appendChild(script);
	}
}

// Update theme dynamically
$: if (giscusLoaded && theme) {
	updateTheme(theme);
}

export function updateTheme(newTheme: string) {
	const iframe = document.querySelector<HTMLIFrameElement>(
		"iframe.giscus-frame",
	);
	if (!iframe) {
		// If the selector fails, try finding any iframe inside the container
		const containerIframe = container?.querySelector("iframe");
		if (!containerIframe) return;

		containerIframe.contentWindow?.postMessage(
			{
				giscus: {
					setConfig: {
						theme: newTheme,
					},
				},
			},
			"https://giscus.app",
		);
		return;
	}

	iframe.contentWindow?.postMessage(
		{
			giscus: {
				setConfig: {
					theme: newTheme,
				},
			},
		},
		"https://giscus.app",
	);
}
</script>

<div class="giscus-wrapper" bind:this={container}></div>

<style>
.giscus-wrapper {
	margin-top: 50px;
	padding-top: 20px;
	border-top: 1px solid var(--border-color);
	min-height: 300px;
}
</style>

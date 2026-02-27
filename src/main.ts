import App from "./App.svelte";

// Handle common browser/extension errors that are often uncatchable
if (typeof window !== "undefined") {
	window.addEventListener("error", (event) => {
		// Suppress or explain "Unchecked runtime.lastError"
		if (event.message?.includes("message port closed")) {
			console.warn(
				"💡 Browser/Extension Note: 'The message port closed before a response was received' is usually caused by a browser extension (like AdBlock or a Password Manager) and typically doesn't affect blog functionality.",
			);
		}
	});
}

const target = document.getElementById("app");
let app;

if (target) {
	app = new App({
		target: target,
	});
}

export default app;

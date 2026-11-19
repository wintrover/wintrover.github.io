<script lang="ts">
import { onMount } from "svelte";
import { push } from "svelte-spa-router";
import { getNotFoundCopy } from "../lib/config";
import { detectLocaleFromRuntime } from "../lib/locale";
import { applyNotFoundSeo } from "../lib/seo";

const browser =
	typeof window !== "undefined" && typeof document !== "undefined";

let resolvedLocale: "ko" | "en" = "en";

$: resolvedLocale = detectLocaleFromRuntime(
	browser ? window.location.pathname : "/",
);
$: notFoundCopy = getNotFoundCopy({ scope: "page", resolvedLocale });

onMount(() => {
	applyNotFoundSeo(resolvedLocale);
});

function goBack() {
	push("/");
}
</script>

<div class="error-container" data-testid="not-found">
  <h2>{notFoundCopy.title}</h2>
  <p>{notFoundCopy.description}</p>
  <button class="back-button" on:click={goBack}>
    {notFoundCopy.homeLink}
  </button>
</div>

<style>
  .error-container {
    text-align: center;
    padding: 5rem 1rem;
    color: #a1a1aa;
  }

  .back-button {
    background: rgb(24 24 27 / 86%);
    border: 1px solid rgb(63 63 70 / 80%);
    color: #fafafa;
    padding: 0.52rem 0.95rem;
    border-radius: 0.62rem;
    cursor: pointer;
    font-size: 0.85rem;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease,
      color 0.2s ease;
  }

  .back-button:hover {
    background: rgb(39 39 42 / 90%);
    border-color: rgb(82 82 91);
    color: #fff;
  }

  :global(html:lang(ko) .error-container) {
    word-break: keep-all;
    overflow-wrap: break-word;
  }
</style>

<script>
  import '../lib/i18n';
  import { isLoading } from 'svelte-i18n';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import '../app.css';
</script>

{#if $isLoading}
  <LoadingSpinner />
{:else}
  <slot />
{/if}
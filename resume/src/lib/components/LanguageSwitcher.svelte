<script>
  import { locale, _ } from "$lib/i18n";

  export let navigate = (href) => globalThis.location.assign(href);

  function switchLanguage() {
    const next = $locale === "ko" ? "en" : "ko";
    locale.set(next);

    let url;
    try {
      url = new URL(globalThis.location.href);
    } catch {
      return;
    }

    const pathname = url.pathname;
    const replaced = pathname.replace(/\/(ko|en)(\/|$)/, `/${next}$2`);
    url.pathname = replaced === pathname ? `/${next}${pathname}` : replaced;

    try {
      navigate(url.toString());
    } catch {
      return;
    }
  }
</script>

<div class="language-switcher">
  <button
    class="language-toggle"
    on:click={switchLanguage}
  >
    {$locale === "ko" ? $_("lang_switcher_en") : $_("lang_switcher_ko")}
  </button>
</div>

<style>
  .language-switcher {
    margin-bottom: 10px;
    text-align: right;
  }

  .language-toggle {
    width: 60px;
    height: 60px;
    border: none;
    background: #DEDEDE;
    color: #4C4C4C;
    vertical-align: middle;
    position: relative;
    z-index: 1;
    border-radius: 3px;
    margin: 1vw 2vw 2vw 0;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 400;
    font-size: 0.85em;
    text-decoration: none;
    cursor: pointer;

    font-family: inherit;
    text-align: center;
    line-height: 1.2;
  }


</style>

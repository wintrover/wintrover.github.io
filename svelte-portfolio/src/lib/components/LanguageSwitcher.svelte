<script>
  import { locale, _ } from "svelte-i18n";

  function switchLanguage(lang) {
    locale.set(lang);
  }
</script>

<div class="language-switcher">
  <button
    class="language-toggle"
    on:click={() => switchLanguage($locale === "ko" ? "en" : "ko")}
  >
    {$locale === "ko" ? "English" : "한국어"}
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

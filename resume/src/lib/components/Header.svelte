<script>
  import { _ } from '$lib/i18n';
  import { site } from '$lib/utils/site.js';
  import LanguageSwitcher from './LanguageSwitcher.svelte';
</script>

<!-- Original Jekyll-style header -->
<div class="container header-container">
  <div class="row">
    <div class="col-xs-12 col-sm-6 col-md-6 col-lg-8 header-left">
      <h1>{$_('site_title')}</h1>
      <h2>{$_('site_subtitle')}</h2>
    </div>
    <div class="col-xs-12 col-sm-6 col-md-6 col-lg-4 header-right">
      <LanguageSwitcher />
      <div class="contact-info">
        <p><strong>{$_('contact_email_label')}:</strong> {site.email}</p>
        <p><strong>{$_('contact_homepage_label')}:</strong> <a href={site.homepageUrl} target="_blank" rel="noopener noreferrer">{site.homepageLabel}</a></p>
      </div>
      <div class="no-print additional-links">
        {#each site.socialLinks as link}
          <a href={link.url} target="_blank" rel="noopener noreferrer" title={$_(`social.${link.id}`)}>
            <i class={link.iconClass}></i>
          </a>
        {/each}
      </div>
    </div>
  </div>
</div>

<script>
  import { _ } from 'svelte-i18n';
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
        <p><strong>Email:</strong> wintrover@gmail.com</p>
        <p><strong>Homepage:</strong> wintrover.github.io</p>
      </div>
      <div class="no-print additional-links">
        <a href="https://github.com/wintrover" target="_blank" rel="noopener noreferrer">
          <i class="fab fa-github"></i>
        </a>
        <a href="https://linkedin.com/in/suhyok-yun-1934b713a" target="_blank" rel="noopener noreferrer">
          <i class="fab fa-linkedin"></i>
        </a>
        <a href="https://wintrover.github.io/blog" target="_blank" rel="noopener noreferrer">
          <i class="fab fa-blogger"></i>
        </a>
      </div>
    </div>
  </div>
</div>
<script>
  import { _ } from 'svelte-i18n';
</script>

<!-- Original Jekyll-style footer -->
<div class="footer-container">
  <div class="container">
    <div class="row">
      <div class="col-xs-12">
        <p>{$_('footer_thank_you')}</p>
      </div>
    </div>
  </div>
</div>

<style>
  .footer-container {
    margin-top: 100px;
  }

  .footer-container p {
    text-align: center;
    font-style: italic;
    font-weight: 300;
  }

  .footer-container a {
    color: inherit;
    font-style: italic;
    font-weight: 300;
  }
</style>
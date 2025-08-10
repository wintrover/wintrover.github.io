<script>
  import { _ } from 'svelte-i18n';
</script>

<!-- Original Jekyll-style about section -->
<div class="container">
  <div class="row">
    <div class="col-xs-12">
      <img class="profile-img" src="/assets/images/profile.png" alt="Profile" />
      <div class="center-text">
        <p>{@html $_('about_content')}</p>
      </div>
    </div>
  </div>
</div>
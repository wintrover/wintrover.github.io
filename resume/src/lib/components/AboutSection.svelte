<script>
  import { _ } from '$lib/i18n';
  import { base } from '$app/paths';
  import { content } from '$lib/utils/site.js';

  $: profileImageSrc = `${base}${content.profileImagePath}`;
  $: profileAlt = $_('profile_alt');
</script>

<!-- Modified about section with horizontal layout -->
<div class="container">
  <div class="row">
    <div class="col-xs-12">
      <div class="about-layout">
        <div class="profile-section">
          <img class="profile-img" src={profileImageSrc} alt={profileAlt} />
        </div>
        <div class="content-section">
          <p>{@html $_('about_content')}</p>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .about-layout {
    display: flex;
    align-items: flex-start;
    gap: 3rem;
    margin-top: 2rem;
  }

  .profile-section {
    flex-shrink: 0;
  }

  .content-section {
    flex: 1;
    text-align: justify;
  }

  @media screen and (max-width: 767px) {
    .about-layout {
      flex-direction: column;
      align-items: center;
      gap: 2rem;
    }

    .content-section {
      text-align: center;
    }
  }
</style>

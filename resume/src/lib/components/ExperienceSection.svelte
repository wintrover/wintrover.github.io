<script>
  import { _ } from '$lib/i18n';
  import { content } from '$lib/utils/site.js';
</script>

<!-- Original Jekyll-style experience section -->
<div class="container">
  <div class="row">
    <div class="col-xs-12">
      <h3>{$_('section_title_experience')}</h3>
      <div class="list-container">
        {#each content.experiences as id, index}
          <div class="layout">
            <div class="details">
              <h4>{$_(`experience.${id}.title`)}</h4>
              <p><b>{$_(`experience.${id}.sub_title`)}</b></p>
              <p>{$_(`experience.${id}.caption`)}</p>
            </div>
            <div class="content">
              <p>{@html $_(`experience.${id}.description`)}</p>
            </div>
          </div>
          {#if index < content.experiences.length - 1}
            <div class="border-weak"></div>
          {/if}
        {/each}
      </div>
    </div>
  </div>
</div>

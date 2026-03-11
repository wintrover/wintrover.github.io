<script>
  import { _ } from '$lib/i18n';
  import { content } from '$lib/utils/site.js';
</script>

<!-- Original Jekyll-style education section -->
<div class="container">
  <div class="row">
    <div class="col-xs-12">
      <h3>{$_('section_title_education')}</h3>
      <div class="list-container">
        {#each content.educations as id, index}
          <div class="layout">
            <div class="details">
              <h4>{$_(`education.${id}.title`)}</h4>
              <p><b>{$_(`education.${id}.sub_title`)}</b></p>
              <p>{$_(`education.${id}.caption`)}</p>
            </div>
            <div class="content">
              <p>{@html $_(`education.${id}.description`)}</p>
            </div>
          </div>
          {#if index < content.educations.length - 1}
            <div class="border-weak"></div>
          {/if}
        {/each}
      </div>
    </div>
  </div>
</div>

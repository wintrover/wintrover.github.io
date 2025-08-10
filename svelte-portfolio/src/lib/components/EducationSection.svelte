<script>
  import { _ } from 'svelte-i18n';

  const educations = [
    { id: 'intel_ai_for_future_workforce' },
    { id: 'halla_university' }
  ];
</script>

<!-- Original Jekyll-style education section -->
<div class="container">
  <div class="row">
    <div class="col-xs-12">
      <h3>{$_('section_title_education')}</h3>
      <div class="list-container">
        {#each educations as edu}
          <div class="layout">
            <div class="details">
              <h4>{$_(`education.${edu.id}.title`)}</h4>
              <p><b>{$_(`education.${edu.id}.sub_title`)}</b></p>
              <p>{$_(`education.${edu.id}.caption`)}</p>
            </div>
            <div class="content">
              <p>{@html $_(`education.${edu.id}.description`)}</p>
            </div>
          </div>
          <div class="border-weak"></div>
        {/each}
      </div>
    </div>
  </div>
</div>
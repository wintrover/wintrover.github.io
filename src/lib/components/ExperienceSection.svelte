<script>
  import { _ } from 'svelte-i18n';

  const experiences = [
    { id: 'focc_inc' },
    { id: 'insight_marketing_labs' },
    { id: 'vizcam' }
  ];
</script>

<!-- Original Jekyll-style experience section -->
<div class="container">
  <div class="row">
    <div class="col-xs-12">
      <h3>{$_('section_title_experience')}</h3>
      <div class="list-container">
        {#each experiences as exp}
          <div class="layout">
            <div class="details">
              <h4>{$_(`experience.${exp.id}.title`)}</h4>
              <p><b>{$_(`experience.${exp.id}.sub_title`)}</b></p>
              <p>{$_(`experience.${exp.id}.caption`)}</p>
            </div>
            <div class="content">
              <p>{@html $_(`experience.${exp.id}.description`)}</p>
            </div>
          </div>
          <div class="border-weak"></div>
        {/each}
      </div>
    </div>
  </div>
</div>
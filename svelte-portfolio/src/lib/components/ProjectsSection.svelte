<script>
  import { _ } from 'svelte-i18n';

  const projects = [
    {
      id: 'cvfactory',
      logo: '/assets/images/CVFactory_logo.png',
      links: [
        { type: 'github', url: 'https://github.com/CV-Factory', icon: 'fab fa-github', text: 'GitHub Repository' },
        { type: 'demo', url: 'https://cvfactory.dev', icon: 'fas fa-external-link-alt', text: 'Live Demo' }
      ]
    },
    {
      id: 'deep_fake_detect_app',
      logo: '/assets/images/Airflow.png',
      links: [
        { type: 'github', url: 'https://github.com/wintrover/DataEngineering_Airflow_ETL.git', icon: 'fab fa-github', text: 'GitHub Repository' }
      ]
    },
    {
      id: 'face_recognition_dating_app',
      logo: '/assets/images/sodamyeon_logo.png',
      links: [
        { type: 'github', url: 'https://github.com/Suyangdaekun/Sodamyeon.git', icon: 'fab fa-github', text: 'GitHub Repository' },
        { type: 'youtube', url: 'https://www.youtube.com/embed/OM7OZrjQ1wo', icon: 'fab fa-youtube', text: 'YouTube Demo' }
      ]
    }
  ];
</script>

<!-- Original Jekyll-style projects section -->
<div class="container">
  <div class="row">
    <div class="col-xs-12">
      <h3>{$_('section_title_projects')}</h3>
      <div class="list-container">
        {#each projects as project}
          <div class="layout">
            <div class="details">
              <img src={project.logo} alt="{$_(`projects.${project.id}.title`)} logo" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px;" />
              <h4>{$_(`projects.${project.id}.title`)}</h4>
              <div class="no-print additional-links">
                {#each project.links as link}
                  <a href={link.url} target="_blank" rel="noopener noreferrer" title={link.text}>
                    <i class={link.icon}></i>
                  </a>
                {/each}
              </div>
            </div>
            <div class="content">
              <p class="quote">{$_(`projects.${project.id}.quote`)}</p>
              <p>{@html $_(`projects.${project.id}.description`)}</p>
            </div>
          </div>
          <div class="border-weak"></div>
        {/each}
      </div>
    </div>
  </div>
</div>
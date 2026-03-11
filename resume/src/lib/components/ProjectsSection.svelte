<script>
  import { _ } from "$lib/i18n";
  import { content } from "$lib/utils/site.js";
</script>

<!-- Original Jekyll-style projects section -->
<div class="container">
  <div class="row">
    <div class="col-xs-12">
      <h3>{$_("section_title_projects")}</h3>
      <div class="list-container">
        {#each content.projects as project, index}
          <div class="layout">
            <div class="details">
              <div class="project-links">
                {#each project.links as link}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={$_(link.titleKey)}
                  >
                    <i class={link.iconClass}></i>
                  </a>
                {/each}
              </div>
              <h4>{$_(`projects.${project.id}.title`)}</h4>
              <p class="quote">{$_(`projects.${project.id}.quote`)}</p>
            </div>
            <div class="content">
              <p>{@html $_(`projects.${project.id}.description`)}</p>
            </div>
          </div>
          {#if index < content.projects.length - 1}
            <div class="border-weak"></div>
          {/if}
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .project-links {
    margin-bottom: 10px;
  }

  .project-links a {
    margin: 0 4px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 25px;
    height: 25px;
    color: #4c4c4c;
  }

  .project-links a i {
    font-size: 25px;
    width: 25px;
    height: 25px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .quote {
    margin-top: 5px;
    margin-bottom: 0;
    padding: 0;
    text-align: left;
  }

  @media screen and (max-width: 767px) {
    .quote {
      text-align: left;
    }
  }
</style>

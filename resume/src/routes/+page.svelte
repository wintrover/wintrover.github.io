<script>
  import Header from '$lib/components/Header.svelte';
  import AboutSection from '$lib/components/AboutSection.svelte';
  import ProjectsSection from '$lib/components/ProjectsSection.svelte';
  import ExperienceSection from '$lib/components/ExperienceSection.svelte';
  import EducationSection from '$lib/components/EducationSection.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { _ } from '$lib/i18n';
  import { site } from '$lib/utils/site.js';
</script>

<svelte:head>
  <title>{$_('meta.title')}</title>
  <meta name="description" content={$_('meta.description')} />
  <meta name="keywords" content={$_('meta.keywords')} />
  <meta property="og:title" content={$_('meta.og_title')} />
  <meta property="og:description" content={$_('meta.og_description')} />
  <meta property="og:type" content={$_('meta.og_type')} />
  <link rel="stylesheet" href={site.fontAwesomeStylesheetUrl} />
</svelte:head>

<!-- Original Jekyll-style layout -->
<div class="page-content">
  <Header />
  <AboutSection />
  <ProjectsSection />
  <ExperienceSection />
  <EducationSection />
  <Footer />
</div>

<style>
  .page-content {
    padding: 0;
  }
</style>

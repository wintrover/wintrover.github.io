<script>
  import Header from '$lib/components/Header.svelte';
  import AboutSection from '$lib/components/AboutSection.svelte';
  import ProjectsSection from '$lib/components/ProjectsSection.svelte';
  import ExperienceSection from '$lib/components/ExperienceSection.svelte';
  import EducationSection from '$lib/components/EducationSection.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { _, locale } from '$lib/i18n';
  import { site } from '$lib/utils/site.js';

  $: currentLocale = $locale === 'en' ? 'en' : 'ko';
  $: canonicalUrl = `https://wintrover.github.io/${currentLocale}/resume/`;
</script>

<svelte:head>
  <title>{$_('meta.title')}</title>
  <link rel="canonical" href={canonicalUrl} />
  <link rel="alternate" hreflang="ko" href="https://wintrover.github.io/ko/resume/" />
  <link rel="alternate" hreflang="en" href="https://wintrover.github.io/en/resume/" />
  <link rel="alternate" hreflang="x-default" href="https://wintrover.github.io/" />
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

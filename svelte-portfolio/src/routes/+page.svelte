<script>
  import Header from '$lib/components/Header.svelte';
  import AboutSection from '$lib/components/AboutSection.svelte';
  import ProjectsSection from '$lib/components/ProjectsSection.svelte';
  import ExperienceSection from '$lib/components/ExperienceSection.svelte';
  import EducationSection from '$lib/components/EducationSection.svelte';
  import Footer from '$lib/components/Footer.svelte';
</script>

<svelte:head>
  <title>윤수혁 | AI 개발자 포트폴리오</title>
  <meta name="description" content="AI·LLM·컴퓨터 비전 프로젝트를 다루는 윤수혁 개발자 포트폴리오" />
  <meta name="keywords" content="AI, Machine Learning, Computer Vision, LLM, NLP, 윤수혁, Suhyok Yun" />
  <meta property="og:title" content="윤수혁 | AI 개발자 포트폴리오" />
  <meta property="og:description" content="AI·LLM·컴퓨터 비전 프로젝트를 다루는 윤수혁 개발자 포트폴리오" />
  <meta property="og:type" content="website" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
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
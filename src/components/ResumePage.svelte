<script lang="ts">
import { defaultOgImage, siteOrigin } from "../lib/config";
import { detectLocaleFromRuntime, localePrefix } from "../lib/locale";
import en from "../lib/resume/locales/en.json";
import ko from "../lib/resume/locales/ko.json";
import { content, site } from "../lib/resume/site";

type Dictionary = Record<string, unknown>;

const resolvedLocale = detectLocaleFromRuntime(
	typeof window !== "undefined" ? window.location.pathname : "/",
);

const dict: Dictionary =
	resolvedLocale === "en"
		? (en as unknown as Dictionary)
		: (ko as unknown as Dictionary);
const canonicalResumeUrl = `${siteOrigin}${localePrefix(resolvedLocale)}/resume/`;

function getValue(obj: Dictionary, key: string): unknown {
	return key.split(".").reduce<unknown>((acc, part) => {
		if (acc && typeof acc === "object" && part in acc) {
			return (acc as Dictionary)[part];
		}
		return undefined;
	}, obj);
}

function t(key: string): string {
	const value = getValue(dict, key);
	return typeof value === "string" ? value : "";
}
</script>

<svelte:head>
	<title>{t("meta.title")}</title>
	<link rel="canonical" href={canonicalResumeUrl} />
	<link rel="alternate" hreflang="ko" href={`${siteOrigin}/ko/resume/`} />
	<link rel="alternate" hreflang="en" href={`${siteOrigin}/resume/`} />
	<link rel="alternate" hreflang="x-default" href={`${siteOrigin}/`} />
	<meta name="description" content={t("meta.description")} />
	<meta name="keywords" content={t("meta.keywords")} />
	<meta
		name="robots"
		content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
	/>
	<meta property="og:title" content={t("meta.og_title")} />
	<meta property="og:description" content={t("meta.og_description")} />
	<meta property="og:type" content={t("meta.og_type")} />
	<meta property="og:url" content={canonicalResumeUrl} />
	<meta property="og:image" content={defaultOgImage} />
	<meta property="og:image:alt" content={t("profile_alt")} />
	<meta property="og:site_name" content="Axiom" />
	{#if site.fontAwesomeStylesheetUrl}
		<link rel="stylesheet" href={site.fontAwesomeStylesheetUrl} />
	{/if}
</svelte:head>

<div class="resume">
	<header class="resume-header motion-reveal">
		<div class="title">
			<h1>{t("site_title")}</h1>
			<h2>{t("site_subtitle")}</h2>
		</div>
		<div class="contact">
			<div class="contact-row">
				<span class="label">{t("contact_email_label")}</span>
				<span>{site.email}</span>
			</div>
			<div class="contact-row">
				<span class="label">{t("contact_homepage_label")}</span>
				<a href={site.homepageUrl} target="_blank" rel="noopener noreferrer">
					{site.homepageLabel}
				</a>
			</div>
			<div class="social motion-stagger-list">
				{#each site.socialLinks as link}
					<a
						href={link.url}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={t(`social.${link.id}`)}
					>
						<i class={link.iconClass}></i>
					</a>
				{/each}
			</div>
		</div>
	</header>

	<section class="section motion-reveal" id="about">
		<h3>{t("about_title")}</h3>
		<div class="prose">{@html t("about_content")}</div>
	</section>

	<section class="section motion-reveal" id="projects">
		<h3>{t("section_title_projects")}</h3>
		<div class="cards motion-stagger-list">
			{#each content.projects as project}
				<article class="card motion-card">
					<div class="card-head">
						<h4>{t(`projects.${project.id}.title`)}</h4>
						<div class="links">
							{#each project.links as link}
								<a href={link.url} target="_blank" rel="noopener noreferrer">
									<i class={link.iconClass}></i>
									<span>{t(`project_link.${link.type}`)}</span>
								</a>
							{/each}
						</div>
					</div>
					<p class="quote">{t(`projects.${project.id}.quote`)}</p>
					<div class="prose">{@html t(`projects.${project.id}.description`)}</div>
				</article>
			{/each}
		</div>
	</section>

	<section class="section motion-reveal" id="experience">
		<h3>{t("section_title_experience")}</h3>
		<div class="cards motion-stagger-list">
			{#each content.experiences as id}
				<article class="card motion-card">
					<div class="card-head">
						<h4>{t(`experience.${id}.title`)}</h4>
						<div class="caption">{t(`experience.${id}.caption`)}</div>
					</div>
					<div class="sub">{t(`experience.${id}.sub_title`)}</div>
					<div class="prose">{@html t(`experience.${id}.description`)}</div>
				</article>
			{/each}
		</div>
	</section>

	<section class="section motion-reveal" id="education">
		<h3>{t("section_title_education")}</h3>
		<div class="cards motion-stagger-list">
			{#each content.educations as id}
				<article class="card motion-card">
					<div class="card-head">
						<h4>{t(`education.${id}.title`)}</h4>
						<div class="caption">{t(`education.${id}.caption`)}</div>
					</div>
					<div class="sub">{t(`education.${id}.sub_title`)}</div>
					<div class="prose">{@html t(`education.${id}.description`)}</div>
				</article>
			{/each}
		</div>
	</section>

	<footer class="resume-footer motion-reveal">
		{t("footer_thank_you")}
	</footer>
</div>

<style>
.resume {
	max-width: 920px;
	margin: 0 auto;
	padding: 28px 18px 40px;
	background: radial-gradient(circle at 12% 0%, rgb(39 39 42 / 30%), transparent 52%)
		#09090b;
	border-radius: 1.1rem;
}

.resume-header {
	display: grid;
	grid-template-columns: 1fr;
	gap: 18px;
	padding-bottom: 18px;
	border-bottom: 1px solid rgb(39 39 42 / 80%);
}

.title h1 {
	margin: 0;
	font-size: 28px;
	font-weight: 700;
	color: #fafafa;
}

.title h2 {
	margin: 6px 0 0;
	font-size: 16px;
	font-weight: 500;
	color: #a1a1aa;
}

.contact {
	display: grid;
	gap: 10px;
	color: #d4d4d8;
}

.contact-row {
	display: grid;
	grid-template-columns: 90px 1fr;
	gap: 10px;
	font-size: 14px;
	color: #d4d4d8;
}

.label {
	color: #71717a;
	font-weight: 600;
}

.social {
	display: flex;
	gap: 10px;
	align-items: center;
}

.social a {
	color: #a1a1aa;
	text-decoration: none;
	font-size: 17px;
	width: 2rem;
	height: 2rem;
	border-radius: 0.65rem;
	border: 1px solid rgb(63 63 70 / 80%);
	background: rgb(24 24 27 / 70%);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	transition:
		transform 0.24s ease,
		color 0.24s ease,
		border-color 0.24s ease,
		background-color 0.24s ease;
}

.social a:hover {
	color: #fafafa;
	border-color: rgb(82 82 91);
	background: rgb(39 39 42 / 78%);
	transform: translateY(-2px);
}

.section {
	padding-top: 22px;
	border-top: 1px solid rgb(39 39 42 / 36%);
}

.section h3 {
	margin: 0 0 12px;
	font-size: 18px;
	font-weight: 700;
	color: #fafafa;
}

.cards {
	display: grid;
	gap: 12px;
}

.card {
	border: 1px solid rgb(63 63 70 / 80%);
	border-radius: 10px;
	background: linear-gradient(160deg, rgb(24 24 27 / 78%), rgb(9 9 11 / 94%));
	padding: 14px;
	transition:
		transform 0.3s ease,
		border-color 0.3s ease,
		box-shadow 0.3s ease;
}

.card:hover {
	transform: translateY(-3px);
	border-color: rgb(82 82 91 / 95%);
	box-shadow: 0 12px 28px rgb(0 0 0 / 28%);
}

.card-head {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	align-items: baseline;
	justify-content: space-between;
}

.card h4 {
	margin: 0;
	font-size: 16px;
	font-weight: 700;
	color: #fafafa;
}

.caption {
	font-size: 12px;
	color: #71717a;
}

.sub {
	margin-top: 6px;
	font-size: 13px;
	font-weight: 600;
	color: #d4d4d8;
}

.quote {
	margin: 10px 0 8px;
	font-size: 13px;
	color: #a1a1aa;
}

.prose :global(p) {
	margin: 0 0 8px;
}

.prose {
	font-size: 14px;
	color: #d4d4d8;
	line-height: 1.6;
}

.links {
	display: flex;
	gap: 10px;
	flex-wrap: wrap;
}

.links a {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-size: 13px;
	text-decoration: none;
	color: #d4d4d8;
	border: 1px solid rgb(63 63 70 / 70%);
	border-radius: 999px;
	padding: 0.3rem 0.65rem;
	background: rgb(24 24 27 / 55%);
	transition:
		border-color 0.24s ease,
		color 0.24s ease,
		transform 0.24s ease;
}

.links a:hover {
	color: #fafafa;
	border-color: rgb(82 82 91);
	transform: translateY(-1px);
}

.resume-footer {
	margin-top: 26px;
	padding-top: 18px;
	border-top: 1px solid rgb(39 39 42 / 80%);
	color: #a1a1aa;
	font-size: 13px;
	text-align: center;
}

.motion-reveal {
	animation: resumeReveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}

#about.motion-reveal {
	animation-delay: 0.05s;
}

#projects.motion-reveal {
	animation-delay: 0.1s;
}

#experience.motion-reveal {
	animation-delay: 0.14s;
}

#education.motion-reveal {
	animation-delay: 0.18s;
}

.motion-stagger-list .motion-card,
.motion-stagger-list a {
	animation: resumeReveal 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.motion-stagger-list .motion-card:nth-child(1),
.motion-stagger-list a:nth-child(1) {
	animation-delay: 0.07s;
}

.motion-stagger-list .motion-card:nth-child(2),
.motion-stagger-list a:nth-child(2) {
	animation-delay: 0.11s;
}

.motion-stagger-list .motion-card:nth-child(3),
.motion-stagger-list a:nth-child(3) {
	animation-delay: 0.15s;
}

.motion-stagger-list .motion-card:nth-child(4),
.motion-stagger-list a:nth-child(4) {
	animation-delay: 0.19s;
}

.motion-stagger-list .motion-card:nth-child(5) {
	animation-delay: 0.23s;
}

.motion-stagger-list .motion-card:nth-child(6) {
	animation-delay: 0.27s;
}

@keyframes resumeReveal {
	from {
		opacity: 0;
		transform: translateY(10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@media (min-width: 820px) {
	.resume-header {
		grid-template-columns: 1fr 320px;
		align-items: start;
	}
}

@media (prefers-reduced-motion: reduce) {
	.motion-reveal,
	.motion-stagger-list .motion-card,
	.motion-stagger-list a {
		animation-duration: 0.01ms;
		animation-iteration-count: 1;
	}

	.card,
	.links a,
	.social a {
		transition-duration: 0.01ms;
	}
}
</style>

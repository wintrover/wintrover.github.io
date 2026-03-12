<script lang="ts">
import en from "../../resume/src/lib/i18n/locales/en.json";
import ko from "../../resume/src/lib/i18n/locales/ko.json";
import { content, site } from "../../resume/src/lib/utils/site.js";
import { detectLocale } from "../lib/locale";

type Dictionary = Record<string, unknown>;

const resolvedLocale = detectLocale({
	envLocale: import.meta.env.VITE_LOCALE,
	pathname: typeof window !== "undefined" ? window.location.pathname : "/",
	navigatorLanguage:
		typeof navigator !== "undefined" ? navigator.language : undefined,
});

const dict: Dictionary = resolvedLocale === "en" ? (en as any) : (ko as any);

function getValue(obj: Dictionary, key: string): unknown {
	return key.split(".").reduce<unknown>((acc, part) => {
		if (acc && typeof acc === "object" && part in (acc as any)) {
			return (acc as any)[part];
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
	{#if site.fontAwesomeStylesheetUrl}
		<link rel="stylesheet" href={site.fontAwesomeStylesheetUrl} />
	{/if}
</svelte:head>

<div class="resume">
	<header class="resume-header">
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
			<div class="social">
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

	<section class="section" id="about">
		<h3>{t("about_title")}</h3>
		<div class="prose">{@html t("about_content")}</div>
	</section>

	<section class="section" id="projects">
		<h3>{t("section_title_projects")}</h3>
		<div class="cards">
			{#each content.projects as project}
				<article class="card">
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

	<section class="section" id="experience">
		<h3>{t("section_title_experience")}</h3>
		<div class="cards">
			{#each content.experiences as id}
				<article class="card">
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

	<section class="section" id="education">
		<h3>{t("section_title_education")}</h3>
		<div class="cards">
			{#each content.educations as id}
				<article class="card">
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

	<footer class="resume-footer">
		{t("footer_thank_you")}
	</footer>
</div>

<style>
.resume {
	max-width: 920px;
	margin: 0 auto;
	padding: 28px 18px 40px;
}

.resume-header {
	display: grid;
	grid-template-columns: 1fr;
	gap: 18px;
	padding-bottom: 18px;
	border-bottom: 1px solid #e1e4e8;
}

.title h1 {
	margin: 0;
	font-size: 28px;
	font-weight: 700;
	color: #24292e;
}

.title h2 {
	margin: 6px 0 0;
	font-size: 16px;
	font-weight: 500;
	color: #586069;
}

.contact {
	display: grid;
	gap: 10px;
}

.contact-row {
	display: grid;
	grid-template-columns: 90px 1fr;
	gap: 10px;
	font-size: 14px;
}

.label {
	color: #586069;
	font-weight: 600;
}

.social {
	display: flex;
	gap: 10px;
	align-items: center;
}

.social a {
	color: #24292e;
	text-decoration: none;
	font-size: 18px;
}

.section {
	padding-top: 22px;
}

.section h3 {
	margin: 0 0 12px;
	font-size: 18px;
	font-weight: 700;
	color: #24292e;
}

.cards {
	display: grid;
	gap: 12px;
}

.card {
	border: 1px solid #e1e4e8;
	border-radius: 10px;
	background: #fff;
	padding: 14px;
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
	color: #24292e;
}

.caption {
	font-size: 12px;
	color: #586069;
}

.sub {
	margin-top: 6px;
	font-size: 13px;
	font-weight: 600;
	color: #24292e;
}

.quote {
	margin: 10px 0 8px;
	font-size: 13px;
	color: #586069;
}

.prose :global(p) {
	margin: 0 0 8px;
}

.prose {
	font-size: 14px;
	color: #24292e;
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
	color: #0366d6;
}

.resume-footer {
	margin-top: 26px;
	padding-top: 18px;
	border-top: 1px solid #e1e4e8;
	color: #586069;
	font-size: 13px;
	text-align: center;
}

@media (min-width: 820px) {
	.resume-header {
		grid-template-columns: 1fr 320px;
		align-items: start;
	}
}
</style>

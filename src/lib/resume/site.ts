import { siteOrigin } from "../config";

type SocialLinkId = "github" | "linkedin";

type SocialLink = {
	id: SocialLinkId;
	url: string;
	iconClass: string;
};

export const site = {
	email: "wintrover@gmail.com",
	homepageUrl: siteOrigin,
	homepageLabel: "wintrover.github.io",
	fontAwesomeStylesheetUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css",
	socialLinks: [
		{
			id: "github",
			url: "https://github.com/wintrover",
			iconClass: "fab fa-github",
		},
		{
			id: "linkedin",
			url: "https://linkedin.com/in/suhyok-yun-1934b713a",
			iconClass: "fab fa-linkedin",
		},
	] satisfies SocialLink[],
};

type ProjectLinkType = "github" | "demo";

type ProjectLink = {
	type: ProjectLinkType;
	url: string;
	iconClass: string;
	titleKey: string;
};

type Project = {
	id: string;
	links: ProjectLink[];
};

export const content = {
	projects: [
		{
			id: "cvfactory",
			links: [
				{
					type: "github",
					url: "https://github.com/CV-Factory",
					iconClass: "fab fa-github",
					titleKey: "project_link.github",
				},
			],
		},
		{
			id: "webkyc_process",
			links: [
				{
					type: "github",
					url: "https://github.com/wintrover/WebKYC_Process",
					iconClass: "fab fa-github",
					titleKey: "project_link.github",
				},
			],
		},
		{
			id: "data_engineer_intern_task",
			links: [
				{
					type: "github",
					url: "https://github.com/wintrover/DataEngineering_Airflow_ETL.git",
					iconClass: "fab fa-github",
					titleKey: "project_link.github",
				},
			],
		},
	] satisfies Project[],
	experiences: ["focc_inc", "insight_marketing_labs", "vizcam"],
	educations: ["intel_ai_for_future_workforce", "halla_university"],
};

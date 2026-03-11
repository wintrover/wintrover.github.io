export const site = {
	email: "wintrover@gmail.com",
	homepageUrl: "https://wintrover.github.io",
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
		{
			id: "blog",
			url: "https://wintrover.github.io/",
			iconClass: "fab fa-blogger",
		},
	],
};

export const content = {
	profileImagePath: "/assets/images/profile.png",
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
				{
					type: "demo",
					url: "https://cvfactory.dev",
					iconClass: "fas fa-external-link-alt",
					titleKey: "project_link.demo",
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
	],
	experiences: ["focc_inc", "insight_marketing_labs", "vizcam"],
	educations: ["intel_ai_for_future_workforce", "halla_university"],
};

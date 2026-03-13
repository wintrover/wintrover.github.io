import { getBaseUrl } from "./config";

function stripTrailingSlash(s: string) {
	return s.endsWith("/") ? s.slice(0, -1) : s;
}

function joinBase(base: string, p: string) {
	const b = stripTrailingSlash(base);
	return `${b}/${p}`;
}

function resolveRelativePath(p: string) {
	const parts = p.split("/");
	const stack: string[] = [];
	for (const part of parts) {
		if (part === "..") {
			stack.pop();
		} else if (part !== "." && part !== "") {
			stack.push(part);
		}
	}
	return stack.join("/");
}

function flattenLegacyAssetsPath(p: string) {
	const rest = p.slice("assets/images/".length);
	const parts = rest.split("/");
	if (parts.length >= 2) {
		const first = parts[0];
		const filename = parts.slice(1).join("/");
		if (/^\d{2}$/.test(first)) {
			return `images/${first}-${filename}`;
		}
		return `images/${filename}`;
	}
	return `images/${rest}`;
}

export function normalizeImageSrc(src: any) {
	if (!src || typeof src !== "string") return src;
	if (/^(https?:\/\/|data:)/i.test(src)) return src;

	const base = getBaseUrl();
	let p = src;
	if (p.startsWith(base)) {
		p = p.slice(base.length);
	}

	p = p.replace(/^blog\//, "");
	p = resolveRelativePath(p);

	if (p.startsWith("assets/images/")) {
		p = flattenLegacyAssetsPath(p);
	}

	return joinBase(base, p);
}

export function formatDate(dateString: string) {
	const date = new Date(dateString);
	return date.toLocaleDateString("ko-KR", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
}

export function truncateText(text: string, wordLimit = 30) {
	if (!text) return "";
	const stripped = text.replace(/<[^>]*>/g, "");
	const words = stripped.match(/\S+/g) ?? [];
	if (words.length <= wordLimit) return stripped.trim();
	return `${words.slice(0, wordLimit).join(" ")}...`;
}

export function slugify(text: string) {
	if (!text) return "";
	const tokens = text.toLowerCase().match(/[a-z0-9_]+/g);
	return tokens ? tokens.join("-") : "";
}

function legacyParseFrontMatter(content: string) {
	const lines = content.split(/\r?\n/);
	const delimiter = /^---\s*$/;
	if (!delimiter.test(lines[0])) {
		return { data: {}, content };
	}

	const endIndexAfterFirstLine = lines
		.slice(1)
		.findIndex((line) => delimiter.test(line));
	if (endIndexAfterFirstLine === -1) {
		return { data: {}, content };
	}
	const endIndex = endIndexAfterFirstLine + 1;

	const frontMatterLines = lines.slice(1, endIndex);
	const body = lines
		.slice(endIndex + 1)
		.join("\n")
		.trim();

	const data: Record<string, any> = {};
	for (const line of frontMatterLines) {
		const trimmed = line.trim();
		if (trimmed.startsWith("#")) continue;

		const colonIndex = trimmed.indexOf(":");
		if (colonIndex <= 0) continue;

		const key = trimmed.slice(0, colonIndex).trim();
		let value = trimmed.slice(colonIndex + 1).trim();
		if (value.length >= 2) {
			const first = value[0];
			const last = value[value.length - 1];
			if ((first === `"` && last === `"`) || (first === `'` && last === `'`)) {
				value = value.slice(1, -1);
			}
		}

		if (key === "tags") {
			let tagsVal = value;
			if (tagsVal.startsWith("[") && tagsVal.endsWith("]")) {
				tagsVal = tagsVal.slice(1, -1);
			}
			data[key] = tagsVal
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean);
			continue;
		}

		if (value === "true") {
			data[key] = true;
			continue;
		}
		if (value === "false") {
			data[key] = false;
			continue;
		}
		const asNumber = Number(value);
		if (value !== "" && !Number.isNaN(asNumber)) {
			data[key] = asNumber;
			continue;
		}
		data[key] = value;
	}

	return { data, content: body };
}

export function parseFrontMatter(content: string) {
	return legacyParseFrontMatter(content);
}

import fs from "node:fs";
import path from "node:path";
import {
	deriveCanonicalUrls,
	localeForUrl,
	parseUrlContract,
	serializeUrlContract,
	sortUrlContract,
	URL_CONTRACT_FILE,
	type UrlContract,
} from "./public-urls";

export type UrlContractUpdatePlan = {
	next: UrlContract;
	added: string[];
	stale: string[];
};

export function planUrlContractUpdate(
	contract: UrlContract,
	derived: Set<string>,
): UrlContractUpdatePlan {
	const canonicalUrls = new Set(
		contract.urls
			.filter((entry) => entry.kind === "canonical")
			.map((entry) => entry.url),
	);
	const added = [...derived].filter((url) => !canonicalUrls.has(url)).sort();
	const stale = [...canonicalUrls].filter((url) => !derived.has(url)).sort();
	const next = sortUrlContract({
		version: contract.version,
		urls: [
			...contract.urls,
			...added.map((url) => ({
				url,
				kind: "canonical" as const,
				locale: localeForUrl(url),
			})),
		],
	});
	return { next, added, stale };
}

function readRegistry(root: string): UrlContract {
	const contractPath = path.join(root, URL_CONTRACT_FILE);
	if (!fs.existsSync(contractPath)) {
		return { version: 1, urls: [] };
	}
	return parseUrlContract(
		JSON.parse(fs.readFileSync(contractPath, "utf-8")) as unknown,
	);
}

function runCli() {
	const root = process.cwd();
	const contract = readRegistry(root);
	const derived = deriveCanonicalUrls(root);
	const plan = planUrlContractUpdate(contract, derived);

	if (plan.stale.length > 0) {
		const guidance = [
			"[url-contract] stale canonical URLs are no longer derived:",
			...plan.stale.map((url) => `  - ${url}`),
			"A published URL cannot be deleted. Convert each stale canonical into an alias:",
			'  {"url": "<stale>", "kind": "alias", "target": "<new canonical>", "evidence": "legacy slug rename"}',
			"Then run `pnpm run url-contract:update` again.",
		].join("\n");
		process.stderr.write(`${guidance}\n`);
		process.exit(1);
	}

	const contractPath = path.join(root, URL_CONTRACT_FILE);
	const serialized = serializeUrlContract(plan.next);
	const previous = fs.existsSync(contractPath)
		? fs.readFileSync(contractPath, "utf-8")
		: "";
	if (serialized !== previous) {
		fs.writeFileSync(contractPath, serialized);
	}

	const canonicalCount = plan.next.urls.filter(
		(entry) => entry.kind === "canonical",
	).length;
	const aliasCount = plan.next.urls.filter(
		(entry) => entry.kind === "alias",
	).length;
	process.stdout.write(
		`[url-contract] updated ${URL_CONTRACT_FILE}: added=${plan.added.length} canonical=${canonicalCount} alias=${aliasCount}\n`,
	);
}

if (
	process.argv[1] &&
	path.basename(process.argv[1]) === "update-url-contract.ts"
) {
	runCli();
}

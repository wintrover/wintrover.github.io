import fs from "node:fs";

const reportPath = new URL(
	"../reports/mutation/mutation.json",
	import.meta.url,
);
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const fileFilter = process.argv[2];

const entries = [];
for (const [file, info] of Object.entries(report.files ?? {})) {
	if (fileFilter && file !== fileFilter) continue;
	for (const mutant of info.mutants ?? []) {
		if (mutant.status === "Survived" || mutant.status === "NoCoverage") {
			entries.push({
				file,
				status: mutant.status,
				mutator: mutant.mutatorName,
				replacement: mutant.replacement,
				line: mutant.location?.start?.line,
				column: mutant.location?.start?.column,
				endLine: mutant.location?.end?.line,
				endColumn: mutant.location?.end?.column,
			});
		}
	}
}

entries.sort(
	(a, b) =>
		a.file.localeCompare(b.file) ||
		a.status.localeCompare(b.status) ||
		(a.line ?? 0) - (b.line ?? 0) ||
		(a.column ?? 0) - (b.column ?? 0),
);

const counts = entries.reduce((acc, e) => {
	acc[e.status] = (acc[e.status] ?? 0) + 1;
	return acc;
}, {});

console.log(
	`total=${entries.length} survived=${counts.Survived ?? 0} noCoverage=${counts.NoCoverage ?? 0}`,
);

const byFile = new Map();
for (const e of entries) {
	const arr = byFile.get(e.file) ?? [];
	arr.push(e);
	byFile.set(e.file, arr);
}

for (const [file, arr] of [...byFile.entries()].sort((a, b) =>
	a[0].localeCompare(b[0]),
)) {
	const survived = arr.filter((x) => x.status === "Survived").length;
	const noCoverage = arr.filter((x) => x.status === "NoCoverage").length;
	console.log(`\n# ${file} survived=${survived} noCoverage=${noCoverage}`);
	for (const e of arr) {
		const loc = `${e.line}:${e.column}-${e.endLine}:${e.endColumn}`;
		const repl = String(e.replacement).replaceAll("\n", "\\n");
		console.log(`${e.status}\t${loc}\t${e.mutator}\t=> ${repl}`);
	}
}

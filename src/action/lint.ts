import { style } from '../utils/logs';
import { getLintIssues, severityOf, groupBy } from '../utils/issues';
import { getAdapter, getAllAdapters } from '../utils/checks';
import type { LintIssue, Severity } from '../utils/checks';
import path from 'node:path';

export type LintOptions = {
	glob: string;
	unstaged: boolean;
	level?: "error" | "warn";
	force?: boolean;
}

/** Returns a styled severity badge: yellow for warn, red for error. */
function severityBadge(severity: Severity): string {
	switch (severity) {
		case "error": return style.red("error");
		case "warn":  return style.yellow("warn");
		default:      return style.dim("off");
	}
}

/** Right-pads a location string to the given width. */
function fmtLocation(loc: string, width: number): string {
	return style.dim(loc.padStart(width));
}

const severityConcisenessFilters = {
	"error": (sev: Severity) => sev === "error",
	"warn": (sev: Severity) => sev === "warn" || sev === "error",
}

// MARK: Display 

export async function lintDocs(opt: LintOptions) {
	const allIssues = await getLintIssues(opt.glob, opt.unstaged, opt.force);
	
	// Filter out issues whose strictness is "off"
	const issues = allIssues.filter(i => {
		const s = severityOf(i.type);
		if (s === "off") return false; // always filter out "off" severity
		if (!opt.level) {
			const l = process.env.CI === "true" ? "error" : "warn";
			return severityConcisenessFilters[l](s);
		}
		return severityConcisenessFilters[opt.level](s);
	});
	const issuesByFile = groupBy(issues, i => i.filePath);

	if (issues.length === 0) {
		console.log(`\n  ${style.bold(style.cyan("No issues found."))}\n`);
		return;
	}

	const cwd = process.cwd();
	const locWidth = maxLocationWidth(issues);
	console.log("");

	for (const [filePath, fileIssues] of Object.entries(issuesByFile)) {
		const relPath = path.relative(cwd, filePath);
		console.log(`  ${style.bold(style.underline(relPath))}`);

		for (const issue of fileIssues) {
			const severity = severityOf(issue.type);
			const adapter = getAdapter(issue.type);

			if (adapter) {
				adapter.format(issue.details, {
					severity,
					locWidth,
					fmtLocation,
					severityBadge,
				});
			}
		}

		console.log("");
	}

	const hasErrors = printSummary(issues, Object.keys(issuesByFile).length);

	if (hasErrors) {
		process.exit(1);
	}
}

/** Returns the widest "line:col" string width across all issues for alignment. */
function maxLocationWidth(issues: LintIssue[]): number {
	let max = 3; // minimum width for "0:0"
	for (const issue of issues) {
		const adapter = getAdapter(issue.type);
		if (adapter) {
			max = Math.max(max, adapter.maxLocationWidth(issue.details));
		}
	}
	return max;
}

/** Prints the summary line. Returns true if any issues are at "error" severity. */
function printSummary(issues: LintIssue[], fileCount: number): boolean {
	let errorCount = 0;
	let warnCount = 0;
	const typeCounts: Record<string, number> = {};

	for (const issue of issues) {
		const severity = severityOf(issue.type);
		const adapter = getAdapter(issue.type);
		const count = adapter ? adapter.countIssues(issue.details) : 1;

		typeCounts[issue.type] = (typeCounts[issue.type] ?? 0) + count;
		if (severity === "error") errorCount += count;
		else if (severity === "warn") warnCount += count;
	}

	const total = errorCount + warnCount;

	const severityParts: string[] = [];
	if (errorCount > 0) severityParts.push(style.red(`${errorCount} error${errorCount === 1 ? '' : 's'}`));
	if (warnCount > 0)  severityParts.push(style.yellow(`${warnCount} warning${warnCount === 1 ? '' : 's'}`));

	// Build type breakdown from all registered adapters, preserving registration order
	const typeParts = getAllAdapters()
		.filter(a => (typeCounts[a.id] ?? 0) > 0)
		.map(a => `${typeCounts[a.id]} ${a.id}`)
		.join(", ");

	const icon = errorCount > 0 ? style.bold(style.red("\u2716")) : style.yellow("\u26A0");
	const totalText = style.bold(`${total} issue${total === 1 ? '' : 's'}`);
	const meta = style.dim(`in ${fileCount} file${fileCount === 1 ? '' : 's'}`);

	console.log(`  ${icon} ${totalText} ${meta} (${severityParts.join(", ")}) ${style.dim(`[${typeParts}]`)}`);
	console.log("");

	return errorCount > 0;
}

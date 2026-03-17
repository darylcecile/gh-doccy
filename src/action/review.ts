import * as p from '@clack/prompts';
import path from 'node:path';
import { style } from '../utils/logs';
import { getLintIssues, severityOf, groupBy } from '../utils/issues';
import { getAdapter, getAllAdapters } from '../utils/checks';
import type { FixAction } from '../utils/checks';

type ReviewOptions = {
	glob: string;
	unstaged: boolean;
	yes: boolean;
}

export async function reviewDocs(opt: ReviewOptions) {
	p.intro(style.bold("doccy review"));

	const spinner = p.spinner();
	spinner.start("Scanning for issues...");

	const allIssues = await getLintIssues(opt.glob, opt.unstaged);
	const issues = allIssues.filter(i => severityOf(i.type) !== "off");

	spinner.stop(
		issues.length === 0
			? "No issues found."
			: `Found ${issues.length} issue${issues.length === 1 ? "" : "s"} to review.`,
	);

	if (issues.length === 0) {
		p.outro(style.cyan("All clear!"));
		return;
	}

	const issuesByFile = groupBy(issues, i => i.filePath);
	const cwd = process.cwd();
	const fixes: FixAction[] = [];

	for (const [filePath, fileIssues] of Object.entries(issuesByFile)) {
		const relPath = path.relative(cwd, filePath);
		p.log.step(style.bold(style.underline(relPath)));

		for (const issue of fileIssues) {
			const adapter = getAdapter(issue.type);
			if (adapter?.review) {
				await adapter.review(issue.filePath, issue.details, fixes, opt.yes);
			}
		}
	}

	// ── Apply ────────────────────────────────────────────────
	if (fixes.length === 0) {
		p.outro(style.dim("No fixes selected."));
		return;
	}

	const applySpinner = p.spinner();
	applySpinner.start("Applying fixes...");

	const fixesByFile = groupBy(fixes, f => f.filePath);
	let filesFixed = 0;
	let totalFixes = 0;

	for (const [filePath, fileFixes] of Object.entries(fixesByFile)) {
		const applied = await applyFixes(filePath, fileFixes);
		if (applied > 0) {
			filesFixed++;
			totalFixes += applied;
		}
	}

	applySpinner.stop(`Applied ${totalFixes} fix${totalFixes === 1 ? "" : "es"} across ${filesFixed} file${filesFixed === 1 ? "" : "s"}.`);

	// List modified files
	for (const filePath of Object.keys(fixesByFile)) {
		const relPath = path.relative(cwd, filePath);
		p.log.success(relPath);
	}

	p.outro(style.cyan("Review complete!"));
}

// ── Fix application ──────────────────────────────────────────

async function applyFixes(filePath: string, fixes: FixAction[]): Promise<number> {
	let raw = await Bun.file(filePath).text();
	let totalApplied = 0;

	// Let each adapter that supports fixes process the full list.
	// Each adapter internally filters to only the fix kinds it handles.
	for (const adapter of getAllAdapters()) {
		if (adapter.applyFixes) {
			const { content, applied } = adapter.applyFixes(raw, fixes);
			raw = content;
			totalApplied += applied;
		}
	}

	if (totalApplied > 0) {
		await Bun.write(filePath, raw);
	}

	return totalApplied;
}

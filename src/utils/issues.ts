import ora from 'ora';
import path from 'node:path';
import { ensureCacheDir, getFileEntryResultFromCache, setFileEntryResultInCache } from './cache';
import { getUnstagedFiles, filterToUnstaged } from './git';
import { runChecks, buildCheckContext, severityOf, groupBy } from './checks';
import type { LintIssue, Severity } from './checks';

export { severityOf, groupBy };
export type { LintIssue, Severity };

export async function getLintIssues(glob: string, unstaged: boolean = false, ignoreCache: boolean = false, verbose: boolean = false) {
	await ensureCacheDir();
	const cwd = process.cwd();
	const files = new Bun.Glob(glob).scanSync({ cwd });

	const spinner = verbose ? ora({ text: 'Discovering files…', discardStdin: false }).start() : null;

	// Collect all matching file paths first
	const allFilePaths: string[] = [];
	for (const fileName of files) {
		allFilePaths.push(`${cwd}/${fileName}`);
	}

	// If --unstaged, filter to only files with unstaged git changes
	const filePaths = unstaged
		? filterToUnstaged(allFilePaths, await getUnstagedFiles())
		: allFilePaths;

	if (spinner) spinner.text = `Found ${filePaths.length} file${filePaths.length === 1 ? '' : 's'} to lint`;

	const issues: LintIssue[] = [];

	for (let i = 0; i < filePaths.length; i++) {
		const filePath = filePaths.at(i)!;
		const relPath = path.relative(cwd, filePath);
		const file = Bun.file(filePath);

		if (spinner) spinner.text = `[${i + 1}/${filePaths.length}] ${relPath}`;

		const c = ignoreCache ? undefined : await getFileEntryResultFromCache(filePath);

		if (c?.issues) {
			issues.push(...c.issues);
			continue;
		}

		const raw = await file.text();
		const ctx = buildCheckContext(filePath, raw);
		const onCheck = spinner
			? (checkId: string) => { spinner.text = `[${i + 1}/${filePaths.length}] ${relPath} — ${checkId}`; }
			: undefined;
		const fileIssues = await runChecks(ctx, onCheck);
		issues.push(...fileIssues);
	}

	if (spinner) spinner.succeed(`Linted ${filePaths.length} file${filePaths.length === 1 ? '' : 's'}`);

	await cacheLintIssues(issues);

	return issues;
}

async function cacheLintIssues(issues: LintIssue[]) {
	const byFile: Record<string, LintIssue[]> = {};
	for (const issue of issues) {
		(byFile[issue.filePath] ??= []).push(issue);
	}

	for (const [filePath, fileIssues] of Object.entries(byFile)) {
		await setFileEntryResultInCache(filePath, { issues: fileIssues });
	}
}

import { ensureCacheDir, getFileEntryResultFromCache, setFileEntryResultInCache } from './cache';
import { getUnstagedFiles, filterToUnstaged } from './git';
import { runChecks, buildCheckContext, severityOf, groupBy } from './checks';
import type { LintIssue, Severity } from './checks';

export { severityOf, groupBy };
export type { LintIssue, Severity };

export async function getLintIssues(glob: string, unstaged: boolean = false, ignoreCache: boolean = false) {
	await ensureCacheDir();
	const cwd = process.cwd();
	const files = new Bun.Glob(glob).scan({ cwd });

	// Collect all matching file paths first
	const allFilePaths: string[] = [];
	for await (const fileName of files) {
		allFilePaths.push(`${cwd}/${fileName}`);
	}

	// If --unstaged, filter to only files with unstaged git changes
	const filePaths = unstaged
		? filterToUnstaged(allFilePaths, await getUnstagedFiles())
		: allFilePaths;

	const issues: LintIssue[] = [];

	for (const filePath of filePaths) {
		const file = Bun.file(filePath);

		const c = ignoreCache ? undefined : await getFileEntryResultFromCache(filePath);

		if (c?.issues) {
			issues.push(...c.issues);
			continue;
		}

		const raw = await file.text();
		const ctx = buildCheckContext(filePath, raw);
		const fileIssues = await runChecks(ctx);
		issues.push(...fileIssues);
	}

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

import { loadConfig } from '../config';
import { parseDoc } from '../docs';
import type { CheckAdapter, CheckContext, FixAction, LintIssue, Severity } from './types';

import { spellingCheck } from './spelling';
import { stalenessCheck } from './staleness';
import { missingDataCheck } from './missing-data';
import { brokenLinksCheck } from './broken-links';

// ── Registry ─────────────────────────────────────────────
// To add a new check, import the adapter and append it here.

const checks: CheckAdapter<any>[] = [
	spellingCheck,
	missingDataCheck,
	stalenessCheck,
	brokenLinksCheck,
];

const config = await loadConfig();

// ── Public API ───────────────────────────────────────────

/** Look up an adapter by its issue type id. */
export function getAdapter(type: string): CheckAdapter<any> | undefined {
	return checks.find(c => c.id === type);
}

/** Get all registered check adapters. */
export function getAllAdapters(): CheckAdapter<any>[] {
	return checks;
}

/** Maps an issue type to its configured severity. */
export function severityOf(type: string): Severity {
	const adapter = getAdapter(type);
	if (!adapter) return "warn";
	const key = adapter.configKey as keyof typeof config.strictness;
	return (config.strictness[key] as Severity) ?? "warn";
}

/**
 * Run all registered checks against a single file.
 * Returns all issues found (may be empty).
 */
export async function runChecks(ctx: CheckContext, onCheck?: (checkId: string) => void): Promise<LintIssue[]> {
	const issues: LintIssue[] = [];

	for (const check of checks) {
		const severity = severityOf(check.id);
		if (severity === "off") continue;

		onCheck?.(check.id);
		const result = await check.check(ctx);
		issues.push(...result);
	}

	return issues;
}

/**
 * Build a CheckContext from a file path and its raw content.
 */
export function buildCheckContext(filePath: string, raw: string): CheckContext {
	const { frontmatter, content, frontmatterLineCount, frontmatterCharCount } = parseDoc(raw);
	return { filePath, raw, content, frontmatter, frontmatterLineCount, frontmatterCharCount };
}

/** Group an array by a key function. */
export function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
	const result: Record<string, T[]> = {};
	for (const item of items) {
		const key = keyFn(item);
		(result[key] ??= []).push(item);
	}
	return result;
}

// Re-export types for convenience
export type { CheckAdapter, CheckContext, FixAction, LintIssue, Severity } from './types';

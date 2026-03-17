import * as p from '@clack/prompts';
import { checkLinks, type BrokenLinkIssue } from '../links';
import { style } from '../logs';
import type { CheckAdapter, CheckContext, FixAction, FormatContext, LintIssue } from './types';

export type { BrokenLinkIssue };

export const brokenLinksCheck: CheckAdapter<BrokenLinkIssue[]> = {
	id: "broken-link",
	configKey: "brokenLinks",

	check(ctx: CheckContext): LintIssue<BrokenLinkIssue[]>[] {
		const issues = checkLinks(ctx.content, ctx.filePath);
		if (issues.length === 0) return [];
		return [{ filePath: ctx.filePath, type: "broken-link", details: issues }];
	},

	countIssues(details) {
		return details.length;
	},

	maxLocationWidth(details) {
		let max = 0;
		for (const bl of details) {
			max = Math.max(max, `${bl.line}:${bl.column}`.length);
		}
		return max;
	},

	format(details, ctx) {
		const badge = ctx.severityBadge(ctx.severity);

		for (const bl of details) {
			const location = ctx.fmtLocation(`${bl.line}:${bl.column}`, ctx.locWidth);
			const url = style.bold(`"${bl.url}"`);
			const linkText = bl.text ? style.dim(` (text: "${bl.text}")`) : "";

			console.log(`    ${location}  ${badge} ${style.dim("broken-link")}  ${url} not found${linkText}`);
		}
	},

	async review(filePath, details, fixes, autoYes) {
		const colorFn = style.yellow;

		for (const bl of details) {
			const location = style.dim(`${bl.line}:${bl.column}`);
			const linkText = bl.text ? ` (text: "${bl.text}")` : "";

			p.log.warn(
				`${colorFn("broken-link")}  ${style.bold(`"${bl.url}"`)} not found${linkText}  ${location}`,
			);
		}

		// Broken links have no auto-fix — they require manual intervention.
		p.log.info(style.dim("Broken links must be fixed manually."));
	},

	// No applyFixes — broken links cannot be auto-fixed
};

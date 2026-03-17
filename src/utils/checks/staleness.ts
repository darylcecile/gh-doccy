import * as p from '@clack/prompts';
import dayjs from 'dayjs';
import { ms } from 'ms';
import { loadConfig } from '../config';
import { parseDoc, serializeFrontMatter } from '../docs';
import { style } from '../logs';
import { defineCheck } from './types';
import type { CheckContext, LintIssue } from './types';

const config = await loadConfig();

export type StaleDetails = {
	lastUpdated: string;
	staleness: string;
};

export const stalenessCheck = defineCheck<StaleDetails>({
	id: "stale",
	configKey: "staleness",

	check(ctx) {
		if (!ctx.frontmatter) return [];
		if (!('lastUpdated' in ctx.frontmatter.metadata)) return [];

		const lastUpdatedStr = ctx.frontmatter.metadata.lastUpdated;
		if (!lastUpdatedStr || !isValidDateFormat(lastUpdatedStr)) return [];

		const lastUpdated = dayjs(lastUpdatedStr, config.dateFormat);
		const thresholdMs = ctx.frontmatter.metadata.staleness ?? config.defaultStalenessThreshold;
		const stalenessMax = lastUpdated.add(ms(thresholdMs), 'ms');

		if (dayjs().isAfter(stalenessMax)) {
			return [{
				filePath: ctx.filePath,
				type: "stale",
				details: { lastUpdated: lastUpdatedStr as string, staleness: thresholdMs },
			}];
		}

		return [];
	},

	countIssues() {
		return 1;
	},

	maxLocationWidth() {
		return 0;
	},

	format(details, ctx) {
		const location = ctx.fmtLocation("0:0", ctx.locWidth);
		const badge = ctx.severityBadge(ctx.severity);
		const date = style.bold(details.lastUpdated);
		const threshold = style.dim(`(exceeded ${details.staleness} threshold)`);

		console.log(`    ${location}  ${badge} ${style.dim("stale")}  Last updated ${date} ${threshold}`);
	},

	async review(filePath, details, fixes, autoYes) {
		p.log.warn(
			`${style.yellow("stale")}  Last updated ${style.bold(details.lastUpdated)}  ` +
			style.dim(`(exceeded ${details.staleness} threshold)`),
		);

		if (autoYes) {
			p.log.info(`${style.dim("Auto-fix:")} updating lastUpdated to today.`);
			fixes.push({ filePath, kind: "stale" });
			return;
		}

		const accepted = await p.confirm({
			message: `Update ${style.bold("lastUpdated")} to today?`,
		});

		if (p.isCancel(accepted)) {
			p.cancel("Review cancelled.");
			process.exit(0);
		}

		if (accepted) {
			fixes.push({ filePath, kind: "stale" });
		}
	},

	applyFixes(raw, fixes) {
		if (!fixes.some(f => f.kind === "stale")) return { content: raw, applied: 0 };

		const { frontmatter, content } = parseDoc(raw);
		if (!frontmatter) return { content: raw, applied: 0 };

		frontmatter.metadata.lastUpdated = dayjs().format(config.dateFormat);
		const result = serializeFrontMatter(frontmatter) + "\n" + content.trimStart();
		return { content: result, applied: 1 };
	},
});

function isValidDateFormat(dateStr?: string): boolean {
	if (!dateStr) return false;
	const format = config.dateFormat;
	const parsed = dayjs(dateStr, format);
	return parsed.isValid();
}

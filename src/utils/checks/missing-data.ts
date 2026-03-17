import * as p from '@clack/prompts';
import dayjs from 'dayjs';
import { loadConfig } from '../config';
import { serializeFrontMatter, type FrontMatter } from '../docs';
import { style } from '../logs';
import type { CheckAdapter, CheckContext, FixAction, FormatContext, LintIssue } from './types';

const config = await loadConfig();

export type MissingDataDetails = Array<{ message: string }>;

export const missingDataCheck: CheckAdapter<MissingDataDetails> = {
	id: "missing-data",
	configKey: "missingData",

	check(ctx: CheckContext): LintIssue<MissingDataDetails>[] {
		const messages: { message: string }[] = [];

		if (!ctx.frontmatter) {
			messages.push({ message: "Missing frontmatter block" });
			messages.push({ message: "Missing frontmatter metadata: lastUpdated" });
		} else if (!('lastUpdated' in ctx.frontmatter.metadata)) {
			messages.push({ message: "Missing frontmatter metadata: lastUpdated" });
		} else if (ctx.frontmatter.metadata.lastUpdated) {
			// Check if lastUpdated is a valid date format
			const parsed = dayjs(ctx.frontmatter.metadata.lastUpdated, config.dateFormat);
			if (!parsed.isValid()) {
				messages.push({
					message: `Invalid date format for lastUpdated: ${ctx.frontmatter.metadata.lastUpdated}, expected ${config.dateFormat}`,
				});
			}
		}

		if (messages.length === 0) return [];

		return [{
			filePath: ctx.filePath,
			type: "missing-data",
			details: messages,
		}];
	},

	countIssues(details) {
		return details.length;
	},

	maxLocationWidth() {
		return 0;
	},

	format(details, ctx) {
		const location = ctx.fmtLocation("0:0", ctx.locWidth);
		const badge = ctx.severityBadge(ctx.severity);

		for (const d of details) {
			console.log(`    ${location}  ${badge} ${style.dim("missing-data")}  ${d.message}`);
		}
	},

	async review(filePath, details, fixes, autoYes) {
		const hasMissingFrontmatter = details.some(d => d.message === "Missing frontmatter block");

		for (const d of details) {
			p.log.warn(`${style.yellow("missing-data")}  ${d.message}`);
		}

		if (!hasMissingFrontmatter) return;

		if (autoYes) {
			p.log.info(`${style.dim("Auto-fix:")} scaffolding frontmatter block.`);
			fixes.push({ filePath, kind: "scaffold-frontmatter" });
			return;
		}

		const accepted = await p.confirm({
			message: "Scaffold a frontmatter block with today's date?",
		});

		if (p.isCancel(accepted)) {
			p.cancel("Review cancelled.");
			process.exit(0);
		}

		if (accepted) {
			fixes.push({ filePath, kind: "scaffold-frontmatter" });
		}
	},

	applyFixes(raw, fixes) {
		if (!fixes.some(f => f.kind === "scaffold-frontmatter")) return { content: raw, applied: 0 };

		const newFrontmatter: FrontMatter = {
			metadata: {
				lastUpdated: dayjs().format(config.dateFormat),
			},
		};
		const content = serializeFrontMatter(newFrontmatter) + "\n" + raw;
		return { content, applied: 1 };
	},
};

import * as p from '@clack/prompts';
import { spellCheck, type SpellingIssue } from '../dictionary';
import { style } from '../logs';
import { defineCheck, type FormatContext } from './types';

export type { SpellingIssue };

export const spellingCheck = defineCheck<SpellingIssue[]>({
	id: "spelling",
	configKey: "spelling",

	async check(ctx) {
		const issues = await spellCheck(ctx.content);
		if (issues.length === 0) return [];
		return [{ filePath: ctx.filePath, type: "spelling", details: issues }];
	},

	countIssues(details) {
		return details.length;
	},

	maxLocationWidth(details) {
		let max = 0;
		for (const sp of details) {
			max = Math.max(max, `${sp.line}:${sp.column}`.length);
		}
		return max;
	},

	format(details, ctx) {
		const badge = ctx.severityBadge(ctx.severity);

		for (const sp of details) {
			const location = ctx.fmtLocation(`${sp.line}:${sp.column}`, ctx.locWidth);
			const word = style.bold(`"${sp.word}"`);
			const suggestions = sp.suggestions.length > 0
				? style.dim(" \u2192 ") + sp.suggestions.slice(0, 5).join(", ")
				: "";

			console.log(`    ${location}  ${badge} ${style.dim("spelling")}  ${word}${suggestions}`);
			printContextSnippet(sp, ctx);
		}
	},

	async review(filePath, details, fixes, autoYes) {
		for (const sp of details) {
			const context = formatReviewContext(sp);
			const location = style.dim(`${sp.line}:${sp.column}`);

			p.log.warn(
				`${style.yellow(style.bold(`"${sp.word}"`))}  ${location}\n` +
				`${style.dim("\u2502")} ${context}`,
			);

			if (sp.suggestions.length === 0) {
				p.log.info(style.dim("No suggestions available \u2014 skipping."));
				continue;
			}

			if (autoYes) {
				const first = sp.suggestions[0]!;
				p.log.info(`${style.dim("Auto-fix:")} ${sp.word} ${style.dim("\u2192")} ${style.bold(first)}`);
				fixes.push({ filePath, kind: "spelling", offset: sp.offset, word: sp.word, replacement: first });
				continue;
			}

			const options = sp.suggestions.slice(0, 5).map(s => ({
				value: s,
				label: s,
				hint: s === sp.suggestions[0] ? "best match" : undefined,
			}));
			options.push({ value: "__skip__", label: "Skip", hint: "leave as-is" });

			const choice = await p.select({
				message: `Replace ${style.bold(`"${sp.word}"`)} with:`,
				options,
			});

			if (p.isCancel(choice)) {
				p.cancel("Review cancelled.");
				process.exit(0);
			}

			if (choice !== "__skip__") {
				fixes.push({
					filePath,
					kind: "spelling",
					offset: sp.offset,
					word: sp.word,
					replacement: choice,
				});
			}
		}
	},

	applyFixes(raw, fixes) {
		const spellingFixes = fixes
			.filter(f => f.kind === "spelling")
			.sort((a, b) => (b.offset as number) - (a.offset as number));

		let content = raw;
		let applied = 0;

		for (const fix of spellingFixes) {
			const offset = fix.offset as number;
			const word = fix.word as string;
			const replacement = fix.replacement as string;
			const before = content.slice(0, offset);
			const after = content.slice(offset + word.length);
			content = before + replacement + after;
			applied++;
		}

		return { content, applied };
	},
});

// ── Helpers ──────────────────────────────────────────────

function printContextSnippet(sp: SpellingIssue, ctx: FormatContext) {
	if (!sp.context) return;

	const idx = sp.context.indexOf(sp.word);
	if (idx === -1) return;

	const colorFn = ctx.severity === "error" ? style.red : style.yellow;
	const gutterPad = " ".repeat(4 + ctx.locWidth + 2);
	const gutter = `${gutterPad}${style.dim("\u2502")} `;
	const before = sp.context.slice(0, idx);
	const after = sp.context.slice(idx + sp.word.length);
	const highlight = style.bold(colorFn(sp.word));
	const underline = colorFn("~".repeat(sp.word.length));

	console.log(`${gutter}${before}${highlight}${after}`);
	console.log(`${gutter}${" ".repeat(before.length)}${underline}`);
}

function formatReviewContext(sp: SpellingIssue): string {
	if (!sp.context) return "";
	const idx = sp.context.indexOf(sp.word);
	if (idx === -1) return style.dim(sp.context);
	const before = sp.context.slice(0, idx);
	const after = sp.context.slice(idx + sp.word.length);
	return `${before}${style.bold(style.yellow(sp.word))}${after}`;
}

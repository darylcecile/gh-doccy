import type { FrontMatter } from '../docs';

export type Severity = "off" | "warn" | "error";

/**
 * Context passed to each check adapter's `check` method.
 * Contains all the parsed information about a single markdown file.
 */
export type CheckContext = {
	/** Absolute path to the file being checked */
	filePath: string;
	/** Raw file content */
	raw: string;
	/** Markdown body content (frontmatter stripped, line numbers preserved) */
	content: string;
	/** Parsed frontmatter, or null if none exists */
	frontmatter: FrontMatter | null;
	/** Number of lines the frontmatter occupies */
	frontmatterLineCount: number;
}

/**
 * A single lint issue produced by a check adapter.
 */
export type LintIssue<TDetails = unknown> = {
	filePath: string;
	type: string;
	details: TDetails;
}

/**
 * Options for formatting an issue line in the lint output.
 */
export type FormatContext = {
	severity: Severity;
	locWidth: number;
	/** Right-pads a location string to the given width (pre-styled). */
	fmtLocation: (loc: string, width: number) => string;
	/** Returns a styled severity badge. */
	severityBadge: (severity: Severity) => string;
}

/**
 * Fix action produced during interactive review.
 */
export type FixAction = {
	filePath: string;
	kind: string;
	[key: string]: unknown;
}

/**
 * The adapter interface that every lint check must implement.
 *
 * To add a new check:
 *   1. Create a new file in src/utils/checks/ implementing CheckAdapter
 *   2. Register it in src/utils/checks/index.ts
 *   3. Add the corresponding strictness key in the config schema
 */
export interface CheckAdapter<TDetails = unknown> {
	/** Unique identifier for this check type (used in issue.type) */
	id: string;

	/** The key in config.strictness that controls this check's severity */
	configKey: string;

	/**
	 * Run the check against a single file.
	 * Return an array of issues (may be empty).
	 */
	check(ctx: CheckContext): Promise<LintIssue<TDetails>[]> | LintIssue<TDetails>[];

	/**
	 * How many individual problems a single issue represents.
	 * For array-based details (spelling, broken-links) this is details.length.
	 * For scalar issues (stale) this is 1.
	 */
	countIssues(details: TDetails): number;

	/**
	 * Return the maximum "line:col" string width for alignment.
	 * Return 0 if this check doesn't use location-based output.
	 */
	maxLocationWidth(details: TDetails): number;

	/**
	 * Print formatted output lines for the lint display.
	 */
	format(details: TDetails, ctx: FormatContext): void;

	/**
	 * Interactive review flow for this check type.
	 * If not provided, issues of this type will be displayed but cannot be fixed.
	 */
	review?(
		filePath: string,
		details: TDetails,
		fixes: FixAction[],
		autoYes: boolean,
	): Promise<void>;

	/**
	 * Apply accumulated fixes for this check type to the raw file content.
	 * Return the modified content and count of fixes applied.
	 * If not provided, no fixes are applied for this check type.
	 */
	applyFixes?(raw: string, fixes: FixAction[]): { content: string; applied: number };
}

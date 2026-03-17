import { describe, test, expect, spyOn, mock } from "bun:test";

// Mock @clack/prompts
mock.module("@clack/prompts", () => ({
	log: {
		warn: mock(() => {}),
		info: mock(() => {}),
		success: mock(() => {}),
		step: mock(() => {}),
	},
	select: mock(async () => "__skip__"),
	confirm: mock(async () => true),
	isCancel: mock(() => false),
	cancel: mock(() => {}),
}));

import { missingDataCheck } from "../utils/checks/missing-data";
import { buildCheckContext } from "../utils/checks";
import type { FormatContext, FixAction } from "../utils/checks/types";
import dayjs from "dayjs";

describe("missingDataCheck", () => {
	describe("check", () => {
		test("reports missing frontmatter block", async () => {
			const ctx = buildCheckContext("/fake/doc.md", "# Hello\n\nText.");
			const issues = await missingDataCheck.check(ctx);
			expect(issues.length).toBe(1);
			expect(issues[0]!.type).toBe("missing-data");
			expect(issues[0]!.details.length).toBe(2); // Missing frontmatter + missing lastUpdated
		});

		test("reports missing lastUpdated when frontmatter exists without it", async () => {
			const raw = [
				"---",
				"metadata:",
				"  tags: []",
				"---",
				"# Hello",
			].join("\n");
			const ctx = buildCheckContext("/fake/doc.md", raw);
			const issues = await missingDataCheck.check(ctx);
			expect(issues.length).toBe(1);
			expect(issues[0]!.details.length).toBe(1);
			expect(issues[0]!.details[0]!.message).toContain("lastUpdated");
		});

		test("reports invalid date format for lastUpdated", async () => {
			const raw = [
				"---",
				"metadata:",
				"  lastUpdated: 'not-a-valid-date-format'",
				"---",
				"# Hello",
			].join("\n");
			const ctx = buildCheckContext("/fake/doc.md", raw);
			const issues = await missingDataCheck.check(ctx);
			expect(issues.length).toBe(1);
			expect(issues[0]!.details[0]!.message).toContain("Invalid date format");
		});

		test("returns empty for valid frontmatter with lastUpdated", async () => {
			const today = dayjs().format("YYYY-MM-DD");
			const raw = [
				"---",
				"metadata:",
				`  lastUpdated: '${today}'`,
				"---",
				"# Hello",
			].join("\n");
			const ctx = buildCheckContext("/fake/doc.md", raw);
			const issues = await missingDataCheck.check(ctx);
			expect(issues).toEqual([]);
		});
	});

	describe("countIssues", () => {
		test("returns the length of the details array", () => {
			const details = [{ message: "a" }, { message: "b" }];
			expect(missingDataCheck.countIssues(details)).toBe(2);
		});
	});

	describe("maxLocationWidth", () => {
		test("always returns 0", () => {
			expect(missingDataCheck.maxLocationWidth([{ message: "test" }])).toBe(0);
		});
	});

	describe("format", () => {
		test("prints formatted output for missing data issues", () => {
			const logSpy = spyOn(console, "log").mockImplementation(() => {});

			const details = [{ message: "Missing frontmatter block" }];
			const fmtCtx: FormatContext = {
				severity: "warn",
				locWidth: 3,
				fmtLocation: (loc, width) => loc.padStart(width),
				severityBadge: (sev) => `[${sev}]`,
			};

			missingDataCheck.format(details, fmtCtx);

			expect(logSpy).toHaveBeenCalledTimes(1);
			const output = logSpy.mock.calls[0]![0] as string;
			expect(output).toContain("Missing frontmatter block");

			logSpy.mockRestore();
		});
	});

	describe("applyFixes", () => {
		test("scaffolds frontmatter block when kind is scaffold-frontmatter", () => {
			const raw = "# Hello\n\nSome text.";
			const fixes = [{ filePath: "/f.md", kind: "scaffold-frontmatter" }];

			const result = missingDataCheck.applyFixes!(raw, fixes);
			expect(result.applied).toBe(1);
			expect(result.content).toContain("---");
			expect(result.content).toContain("lastUpdated");
			expect(result.content).toContain("# Hello");
		});

		test("returns unchanged content when no scaffold fixes", () => {
			const raw = "# Hello\n\nSome text.";
			const fixes = [{ filePath: "/f.md", kind: "spelling", offset: 0, word: "x", replacement: "y" }];

			const result = missingDataCheck.applyFixes!(raw, fixes);
			expect(result.content).toBe(raw);
			expect(result.applied).toBe(0);
		});
	});

	describe("review", () => {
		test("auto-fixes when autoYes is true and frontmatter is missing", async () => {
			const fixes: FixAction[] = [];
			const details = [{ message: "Missing frontmatter block" }, { message: "Missing frontmatter metadata: lastUpdated" }];

			await missingDataCheck.review!("/fake/doc.md", details, fixes, true);

			expect(fixes.length).toBe(1);
			expect(fixes[0]!.kind).toBe("scaffold-frontmatter");
		});

		test("does not auto-fix when frontmatter exists but lastUpdated is missing", async () => {
			const fixes: FixAction[] = [];
			const details = [{ message: "Missing frontmatter metadata: lastUpdated" }];

			await missingDataCheck.review!("/fake/doc.md", details, fixes, true);

			// No fix because the frontmatter exists, just missing lastUpdated
			expect(fixes.length).toBe(0);
		});

		test("prompts user when not autoYes and user accepts", async () => {
			const fixes: FixAction[] = [];
			const details = [{ message: "Missing frontmatter block" }, { message: "Missing frontmatter metadata: lastUpdated" }];

			// confirm mock returns true
			await missingDataCheck.review!("/fake/doc.md", details, fixes, false);

			expect(fixes.length).toBe(1);
			expect(fixes[0]!.kind).toBe("scaffold-frontmatter");
		});

		test("does not add fix when user declines", async () => {
			// Re-mock with confirm returning false
			mock.module("@clack/prompts", () => ({
				log: {
					warn: mock(() => {}),
					info: mock(() => {}),
					success: mock(() => {}),
					step: mock(() => {}),
				},
				select: mock(async () => "__skip__"),
				confirm: mock(async () => false),
				isCancel: mock(() => false),
				cancel: mock(() => {}),
			}));

			const fixes: FixAction[] = [];
			const details = [{ message: "Missing frontmatter block" }, { message: "Missing frontmatter metadata: lastUpdated" }];

			await missingDataCheck.review!("/fake/doc.md", details, fixes, false);

			expect(fixes.length).toBe(0);

			// Restore the original mock
			mock.module("@clack/prompts", () => ({
				log: {
					warn: mock(() => {}),
					info: mock(() => {}),
					success: mock(() => {}),
					step: mock(() => {}),
				},
				select: mock(async () => "__skip__"),
				confirm: mock(async () => true),
				isCancel: mock(() => false),
				cancel: mock(() => {}),
			}));
		});

		test("exits when user cancels confirm prompt", async () => {
			const exitSpy = spyOn(process, "exit").mockImplementation(() => undefined as never);

			// Re-mock with isCancel returning true
			mock.module("@clack/prompts", () => ({
				log: {
					warn: mock(() => {}),
					info: mock(() => {}),
					success: mock(() => {}),
					step: mock(() => {}),
				},
				select: mock(async () => "__skip__"),
				confirm: mock(async () => Symbol("cancel")),
				isCancel: mock(() => true),
				cancel: mock(() => {}),
			}));

			const fixes: FixAction[] = [];
			const details = [{ message: "Missing frontmatter block" }, { message: "Missing frontmatter metadata: lastUpdated" }];

			await missingDataCheck.review!("/fake/doc.md", details, fixes, false);

			expect(exitSpy).toHaveBeenCalledWith(0);
			exitSpy.mockRestore();

			// Restore the original mock
			mock.module("@clack/prompts", () => ({
				log: {
					warn: mock(() => {}),
					info: mock(() => {}),
					success: mock(() => {}),
					step: mock(() => {}),
				},
				select: mock(async () => "__skip__"),
				confirm: mock(async () => true),
				isCancel: mock(() => false),
				cancel: mock(() => {}),
			}));
		});
	});
});

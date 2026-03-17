import { describe, test, expect, spyOn, mock } from "bun:test";

// Mock @clack/prompts before importing spelling check
mock.module("@clack/prompts", () => ({
	log: {
		warn: mock(() => {}),
		info: mock(() => {}),
		success: mock(() => {}),
		step: mock(() => {}),
	},
	select: mock(async () => "tests"),
	confirm: mock(async () => true),
	isCancel: mock(() => false),
	cancel: mock(() => {}),
}));

import { spellingCheck } from "../utils/checks/spelling";
import { buildCheckContext } from "../utils/checks";
import type { FormatContext, FixAction } from "../utils/checks/types";

describe("spellingCheck", () => {
	describe("check", () => {
		test("returns empty array for correct text", async () => {
			const ctx = buildCheckContext("/fake/doc.md", "# Hello\n\nThis is correct text.");
			const issues = await spellingCheck.check(ctx);
			expect(issues).toEqual([]);
		});

		test("returns issues for misspelled words", async () => {
			const ctx = buildCheckContext("/fake/doc.md", "# Hello\n\nThis has testss in it.");
			const issues = await spellingCheck.check(ctx);
			expect(issues.length).toBe(1);
			expect(issues[0]!.type).toBe("spelling");
			expect(issues[0]!.filePath).toBe("/fake/doc.md");
			expect(issues[0]!.details.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe("countIssues", () => {
		test("returns the length of the details array", () => {
			const details = [
				{ word: "testss", line: 1, column: 1, offset: 0, context: "", suggestions: [] },
				{ word: "wrng", line: 2, column: 1, offset: 10, context: "", suggestions: [] },
			];
			expect(spellingCheck.countIssues(details)).toBe(2);
		});

		test("returns 0 for empty details", () => {
			expect(spellingCheck.countIssues([])).toBe(0);
		});
	});

	describe("maxLocationWidth", () => {
		test("returns max location string width", () => {
			const details = [
				{ word: "a", line: 1, column: 5, offset: 0, context: "", suggestions: [] },
				{ word: "b", line: 100, column: 20, offset: 0, context: "", suggestions: [] },
			];
			// "100:20" = length 6
			expect(spellingCheck.maxLocationWidth(details)).toBe(6);
		});

		test("returns 0 for empty details", () => {
			expect(spellingCheck.maxLocationWidth([])).toBe(0);
		});
	});

	describe("format", () => {
		test("prints formatted output for spelling issues", () => {
			const logSpy = spyOn(console, "log").mockImplementation(() => {});

			const details = [
				{ word: "testss", line: 3, column: 10, offset: 30, context: "This has testss in it", suggestions: ["tests", "test"] },
			];
			const fmtCtx: FormatContext = {
				severity: "warn",
				locWidth: 5,
				fmtLocation: (loc, width) => loc.padStart(width),
				severityBadge: (sev) => `[${sev}]`,
			};

			spellingCheck.format(details, fmtCtx);

			expect(logSpy).toHaveBeenCalled();
			logSpy.mockRestore();
		});

		test("handles issues with no suggestions", () => {
			const logSpy = spyOn(console, "log").mockImplementation(() => {});

			const details = [
				{ word: "xyzzy", line: 1, column: 1, offset: 0, context: "the xyzzy word", suggestions: [] },
			];
			const fmtCtx: FormatContext = {
				severity: "error",
				locWidth: 3,
				fmtLocation: (loc, width) => loc.padStart(width),
				severityBadge: (sev) => `[${sev}]`,
			};

			spellingCheck.format(details, fmtCtx);

			expect(logSpy).toHaveBeenCalled();
			logSpy.mockRestore();
		});

		test("handles issues with empty context", () => {
			const logSpy = spyOn(console, "log").mockImplementation(() => {});

			const details = [
				{ word: "testss", line: 1, column: 1, offset: 0, context: "", suggestions: ["tests"] },
			];
			const fmtCtx: FormatContext = {
				severity: "warn",
				locWidth: 3,
				fmtLocation: (loc, width) => loc.padStart(width),
				severityBadge: (sev) => `[${sev}]`,
			};

			spellingCheck.format(details, fmtCtx);

			expect(logSpy).toHaveBeenCalled();
			logSpy.mockRestore();
		});
	});

	describe("applyFixes", () => {
		test("replaces misspelled words with corrections", () => {
			const raw = "This has testss in it.";
			const fixes = [
				{ filePath: "/f.md", kind: "spelling", offset: 9, word: "testss", replacement: "tests" },
			];

			const result = spellingCheck.applyFixes!(raw, fixes);
			expect(result.content).toBe("This has tests in it.");
			expect(result.applied).toBe(1);
		});

		test("applies multiple fixes in correct order", () => {
			const raw = "The testss and wrng words.";
			const fixes = [
				{ filePath: "/f.md", kind: "spelling", offset: 4, word: "testss", replacement: "tests" },
				{ filePath: "/f.md", kind: "spelling", offset: 15, word: "wrng", replacement: "wrong" },
			];

			const result = spellingCheck.applyFixes!(raw, fixes);
			expect(result.content).toBe("The tests and wrong words.");
			expect(result.applied).toBe(2);
		});

		test("ignores non-spelling fixes", () => {
			const raw = "Some text.";
			const fixes = [
				{ filePath: "/f.md", kind: "stale" },
			];

			const result = spellingCheck.applyFixes!(raw, fixes);
			expect(result.content).toBe("Some text.");
			expect(result.applied).toBe(0);
		});
	});

	describe("review", () => {
		test("auto-fixes with first suggestion when autoYes is true", async () => {
			const fixes: FixAction[] = [];
			const details = [
				{ word: "testss", line: 3, column: 10, offset: 30, context: "This has testss in it", suggestions: ["tests", "test"] },
			];

			await spellingCheck.review!("/fake/doc.md", details, fixes, true);

			expect(fixes.length).toBe(1);
			expect(fixes[0]!.kind).toBe("spelling");
			expect(fixes[0]!.replacement).toBe("tests");
		});

		test("skips when no suggestions and autoYes", async () => {
			const fixes: FixAction[] = [];
			const details = [
				{ word: "xyzzy", line: 1, column: 1, offset: 0, context: "the xyzzy word", suggestions: [] },
			];

			await spellingCheck.review!("/fake/doc.md", details, fixes, true);

			expect(fixes.length).toBe(0);
		});

		test("prompts user for selection when not autoYes", async () => {
			const fixes: FixAction[] = [];
			const details = [
				{ word: "testss", line: 1, column: 1, offset: 0, context: "has testss here", suggestions: ["tests", "test"] },
			];

			await spellingCheck.review!("/fake/doc.md", details, fixes, false);

			// The mock select returns "tests"
			expect(fixes.length).toBe(1);
			expect(fixes[0]!.replacement).toBe("tests");
		});

		test("skips when user selects __skip__", async () => {
			// Re-mock with select returning __skip__
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

			const fixes: FixAction[] = [];
			const details = [
				{ word: "testss", line: 1, column: 1, offset: 0, context: "has testss", suggestions: ["tests"] },
			];

			await spellingCheck.review!("/fake/doc.md", details, fixes, false);

			expect(fixes.length).toBe(0);

			// Restore the original mock
			mock.module("@clack/prompts", () => ({
				log: {
					warn: mock(() => {}),
					info: mock(() => {}),
					success: mock(() => {}),
					step: mock(() => {}),
				},
				select: mock(async () => "tests"),
				confirm: mock(async () => true),
				isCancel: mock(() => false),
				cancel: mock(() => {}),
			}));
		});

		test("exits when user cancels select prompt", async () => {
			const exitSpy = spyOn(process, "exit").mockImplementation(() => undefined as never);

			// Re-mock with isCancel returning true
			mock.module("@clack/prompts", () => ({
				log: {
					warn: mock(() => {}),
					info: mock(() => {}),
					success: mock(() => {}),
					step: mock(() => {}),
				},
				select: mock(async () => Symbol("cancel")),
				confirm: mock(async () => true),
				isCancel: mock(() => true),
				cancel: mock(() => {}),
			}));

			const fixes: FixAction[] = [];
			const details = [
				{ word: "testss", line: 1, column: 1, offset: 0, context: "has testss", suggestions: ["tests"] },
			];

			await spellingCheck.review!("/fake/doc.md", details, fixes, false);

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
				select: mock(async () => "tests"),
				confirm: mock(async () => true),
				isCancel: mock(() => false),
				cancel: mock(() => {}),
			}));
		});

		test("handles empty context in review", async () => {
			const fixes: FixAction[] = [];
			const details = [
				{ word: "testss", line: 1, column: 1, offset: 0, context: "", suggestions: ["tests"] },
			];

			await spellingCheck.review!("/fake/doc.md", details, fixes, true);
			expect(fixes.length).toBe(1);
		});

		test("handles context where word is not found", async () => {
			const fixes: FixAction[] = [];
			const details = [
				{ word: "testss", line: 1, column: 1, offset: 0, context: "some other context", suggestions: ["tests"] },
			];

			await spellingCheck.review!("/fake/doc.md", details, fixes, true);
			expect(fixes.length).toBe(1);
		});
	});
});

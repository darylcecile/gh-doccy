import { describe, test, expect, spyOn } from "bun:test";
import { brokenLinksCheck } from "../utils/checks/broken-links";
import { buildCheckContext } from "../utils/checks";
import type { FormatContext } from "../utils/checks/types";

describe("brokenLinksCheck", () => {
	describe("check", () => {
		test("returns empty array when no broken links", async () => {
			const ctx = buildCheckContext("/fake/doc.md", "# Hello\n\nSome text.");
			const issues = await brokenLinksCheck.check(ctx);
			expect(issues).toEqual([]);
		});

		test("detects broken relative links", async () => {
			const ctx = buildCheckContext("/fake/doc.md", "See [guide](./nonexistent.md) for details.");
			const issues = await brokenLinksCheck.check(ctx);
			expect(issues.length).toBe(1);
			expect(issues[0]!.type).toBe("broken-link");
			expect(issues[0]!.details.length).toBe(1);
			expect(issues[0]!.details[0]!.url).toBe("./nonexistent.md");
		});

		test("ignores absolute URLs", async () => {
			const ctx = buildCheckContext("/fake/doc.md", "See [site](https://example.com) for details.");
			const issues = await brokenLinksCheck.check(ctx);
			expect(issues).toEqual([]);
		});
	});

	describe("countIssues", () => {
		test("returns the length of the details array", () => {
			const details = [
				{ url: "./a.md", line: 1, column: 1, text: "a" },
				{ url: "./b.md", line: 2, column: 1, text: "b" },
			];
			expect(brokenLinksCheck.countIssues(details)).toBe(2);
		});
	});

	describe("maxLocationWidth", () => {
		test("returns max location string width", () => {
			const details = [
				{ url: "./a.md", line: 1, column: 5, text: "a" },
				{ url: "./b.md", line: 100, column: 20, text: "b" },
			];
			// "100:20" = length 6
			expect(brokenLinksCheck.maxLocationWidth(details)).toBe(6);
		});

		test("returns 0 for empty details", () => {
			expect(brokenLinksCheck.maxLocationWidth([])).toBe(0);
		});
	});

	describe("format", () => {
		test("prints formatted output for broken link issues", () => {
			const logSpy = spyOn(console, "log").mockImplementation(() => {});

			const details = [
				{ url: "./missing.md", line: 5, column: 10, text: "guide" },
			];
			const fmtCtx: FormatContext = {
				severity: "warn",
				locWidth: 5,
				fmtLocation: (loc, width) => loc.padStart(width),
				severityBadge: (sev) => `[${sev}]`,
			};

			brokenLinksCheck.format(details, fmtCtx);

			expect(logSpy).toHaveBeenCalledTimes(1);
			const output = logSpy.mock.calls[0]![0] as string;
			expect(output).toContain("missing.md");
			expect(output).toContain("not found");

			logSpy.mockRestore();
		});

		test("handles broken link with no text", () => {
			const logSpy = spyOn(console, "log").mockImplementation(() => {});

			const details = [
				{ url: "./missing.png", line: 1, column: 1, text: "" },
			];
			const fmtCtx: FormatContext = {
				severity: "error",
				locWidth: 3,
				fmtLocation: (loc, width) => loc.padStart(width),
				severityBadge: (sev) => `[${sev}]`,
			};

			brokenLinksCheck.format(details, fmtCtx);

			expect(logSpy).toHaveBeenCalledTimes(1);
			logSpy.mockRestore();
		});
	});

	describe("review", () => {
		test("logs broken link info (no auto-fix available)", async () => {
			// brokenLinksCheck.review exists and just logs info
			const details = [
				{ url: "./missing.md", line: 1, column: 1, text: "link" },
			];
			const fixes: any[] = [];

			// This should not throw and should not add any fixes
			await brokenLinksCheck.review!("/fake/doc.md", details, fixes, false);
			expect(fixes.length).toBe(0);
		});
	});
});

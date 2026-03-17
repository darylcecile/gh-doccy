import { describe, test, expect, spyOn, mock } from "bun:test";

// Mock @clack/prompts
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

import { stalenessCheck } from "../utils/checks/staleness";
import { buildCheckContext } from "../utils/checks";
import type { FormatContext, FixAction } from "../utils/checks/types";
import dayjs from "dayjs";

describe("stalenessCheck", () => {
	describe("check", () => {
		test("returns empty array when no frontmatter", async () => {
			const ctx = buildCheckContext("/fake/doc.md", "# Hello\n\nText.");
			const issues = await stalenessCheck.check(ctx);
			expect(issues).toEqual([]);
		});

		test("returns empty array when no lastUpdated field", async () => {
			const raw = [
				"---",
				"metadata:",
				"  tags: []",
				"---",
				"# Hello",
			].join("\n");
			const ctx = buildCheckContext("/fake/doc.md", raw);
			const issues = await stalenessCheck.check(ctx);
			expect(issues).toEqual([]);
		});

		test("returns empty array for recently updated document", async () => {
			const today = dayjs().format("YYYY-MM-DD");
			const raw = [
				"---",
				"metadata:",
				`  lastUpdated: '${today}'`,
				"---",
				"# Hello",
			].join("\n");
			const ctx = buildCheckContext("/fake/doc.md", raw);
			const issues = await stalenessCheck.check(ctx);
			expect(issues).toEqual([]);
		});

		test("returns stale issue for old document", async () => {
			const oldDate = dayjs().subtract(60, "day").format("YYYY-MM-DD");
			const raw = [
				"---",
				"metadata:",
				`  lastUpdated: '${oldDate}'`,
				"---",
				"# Hello",
			].join("\n");
			const ctx = buildCheckContext("/fake/doc.md", raw);
			const issues = await stalenessCheck.check(ctx);
			expect(issues.length).toBe(1);
			expect(issues[0]!.type).toBe("stale");
			expect(issues[0]!.details.lastUpdated).toBe(oldDate);
		});

		test("returns empty array for invalid date format", async () => {
			const raw = [
				"---",
				"metadata:",
				"  lastUpdated: 'not-a-date'",
				"---",
				"# Hello",
			].join("\n");
			const ctx = buildCheckContext("/fake/doc.md", raw);
			const issues = await stalenessCheck.check(ctx);
			expect(issues).toEqual([]);
		});
	});

	describe("countIssues", () => {
		test("always returns 1", () => {
			expect(stalenessCheck.countIssues({ lastUpdated: "2024-01-01", staleness: "30d" })).toBe(1);
		});
	});

	describe("maxLocationWidth", () => {
		test("always returns 0", () => {
			expect(stalenessCheck.maxLocationWidth({ lastUpdated: "2024-01-01", staleness: "30d" })).toBe(0);
		});
	});

	describe("format", () => {
		test("prints formatted staleness output", () => {
			const logSpy = spyOn(console, "log").mockImplementation(() => {});

			const details = { lastUpdated: "2024-01-01", staleness: "30d" };
			const fmtCtx: FormatContext = {
				severity: "warn",
				locWidth: 5,
				fmtLocation: (loc, width) => loc.padStart(width),
				severityBadge: (sev) => `[${sev}]`,
			};

			stalenessCheck.format(details, fmtCtx);

			expect(logSpy).toHaveBeenCalledTimes(1);
			const output = logSpy.mock.calls[0]![0] as string;
			expect(output).toContain("2024-01-01");
			expect(output).toContain("30d");

			logSpy.mockRestore();
		});
	});

	describe("applyFixes", () => {
		test("updates lastUpdated to today's date", () => {
			const raw = [
				"---",
				"metadata:",
				"  lastUpdated: '2024-01-01'",
				"---",
				"# Title",
				"",
				"Some text.",
			].join("\n");
			const fixes = [{ filePath: "/f.md", kind: "stale" }];

			const result = stalenessCheck.applyFixes!(raw, fixes);
			expect(result.applied).toBe(1);
			expect(result.content).toContain("lastUpdated");
			expect(result.content).not.toContain("2024-01-01");
		});

		test("returns unchanged content when no stale fixes", () => {
			const raw = "# Hello\n\nText.";
			const fixes = [{ filePath: "/f.md", kind: "spelling", offset: 0, word: "x", replacement: "y" }];

			const result = stalenessCheck.applyFixes!(raw, fixes);
			expect(result.content).toBe(raw);
			expect(result.applied).toBe(0);
		});

		test("returns unchanged content when no frontmatter", () => {
			const raw = "# Hello\n\nText.";
			const fixes = [{ filePath: "/f.md", kind: "stale" }];

			const result = stalenessCheck.applyFixes!(raw, fixes);
			expect(result.content).toBe(raw);
			expect(result.applied).toBe(0);
		});
	});

	describe("review", () => {
		test("auto-fixes when autoYes is true", async () => {
			const fixes: FixAction[] = [];
			const details = { lastUpdated: "2024-01-01", staleness: "30d" };

			await stalenessCheck.review!("/fake/doc.md", details, fixes, true);

			expect(fixes.length).toBe(1);
			expect(fixes[0]!.kind).toBe("stale");
		});

		test("prompts user when not autoYes and user accepts", async () => {
			const fixes: FixAction[] = [];
			const details = { lastUpdated: "2024-01-01", staleness: "30d" };

			// confirm mock returns true
			await stalenessCheck.review!("/fake/doc.md", details, fixes, false);

			expect(fixes.length).toBe(1);
			expect(fixes[0]!.kind).toBe("stale");
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
				select: mock(async () => "tests"),
				confirm: mock(async () => false),
				isCancel: mock(() => false),
				cancel: mock(() => {}),
			}));

			const fixes: FixAction[] = [];
			const details = { lastUpdated: "2024-01-01", staleness: "30d" };

			await stalenessCheck.review!("/fake/doc.md", details, fixes, false);

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
				select: mock(async () => "tests"),
				confirm: mock(async () => Symbol("cancel")),
				isCancel: mock(() => true),
				cancel: mock(() => {}),
			}));

			const fixes: FixAction[] = [];
			const details = { lastUpdated: "2024-01-01", staleness: "30d" };

			await stalenessCheck.review!("/fake/doc.md", details, fixes, false);

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
	});
});

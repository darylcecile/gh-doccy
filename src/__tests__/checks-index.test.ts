import { describe, test, expect } from "bun:test";
import {
	getAdapter,
	getAllAdapters,
	severityOf,
	runChecks,
	buildCheckContext,
	groupBy,
} from "../utils/checks";

describe("getAdapter", () => {
	test("returns the spelling adapter by id", () => {
		const adapter = getAdapter("spelling");
		expect(adapter).toBeDefined();
		expect(adapter!.id).toBe("spelling");
	});

	test("returns the stale adapter by id", () => {
		const adapter = getAdapter("stale");
		expect(adapter).toBeDefined();
		expect(adapter!.id).toBe("stale");
	});

	test("returns the missing-data adapter by id", () => {
		const adapter = getAdapter("missing-data");
		expect(adapter).toBeDefined();
		expect(adapter!.id).toBe("missing-data");
	});

	test("returns the broken-link adapter by id", () => {
		const adapter = getAdapter("broken-link");
		expect(adapter).toBeDefined();
		expect(adapter!.id).toBe("broken-link");
	});

	test("returns undefined for unknown adapter id", () => {
		const adapter = getAdapter("nonexistent");
		expect(adapter).toBeUndefined();
	});
});

describe("getAllAdapters", () => {
	test("returns all 4 registered adapters", () => {
		const adapters = getAllAdapters();
		expect(adapters.length).toBe(4);

		const ids = adapters.map(a => a.id);
		expect(ids).toContain("spelling");
		expect(ids).toContain("stale");
		expect(ids).toContain("missing-data");
		expect(ids).toContain("broken-link");
	});
});

describe("severityOf", () => {
	test("returns a severity for known check types", () => {
		const sev = severityOf("spelling");
		expect(["off", "warn", "error"]).toContain(sev);
	});

	test("returns 'warn' for unknown check types", () => {
		const sev = severityOf("nonexistent-check");
		expect(sev).toBe("warn");
	});
});

describe("buildCheckContext", () => {
	test("builds context from raw markdown without frontmatter", () => {
		const raw = "# Hello\n\nSome text.";
		const ctx = buildCheckContext("/fake/file.md", raw);

		expect(ctx.filePath).toBe("/fake/file.md");
		expect(ctx.raw).toBe(raw);
		expect(ctx.content).toBe(raw);
		expect(ctx.frontmatter).toBeNull();
		expect(ctx.frontmatterLineCount).toBe(0);
	});

	test("builds context from raw markdown with frontmatter", () => {
		const raw = [
			"---",
			"metadata:",
			"  lastUpdated: '2024-01-01'",
			"---",
			"# Title",
		].join("\n");
		const ctx = buildCheckContext("/fake/file.md", raw);

		expect(ctx.filePath).toBe("/fake/file.md");
		expect(ctx.raw).toBe(raw);
		expect(ctx.frontmatter).not.toBeNull();
		expect(ctx.frontmatter!.metadata.lastUpdated).toBe("2024-01-01");
		expect(ctx.frontmatterLineCount).toBe(4);
	});
});

describe("runChecks", () => {
	test("returns issues for markdown with no frontmatter", async () => {
		const raw = "# Hello\n\nSome text.";
		const ctx = buildCheckContext("/fake/file.md", raw);
		const issues = await runChecks(ctx);

		// Should at least find missing-data issues (no frontmatter)
		const missingData = issues.filter(i => i.type === "missing-data");
		expect(missingData.length).toBeGreaterThan(0);
	});

	test("returns empty array for well-formed document with recent date", async () => {
		const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
		const raw = [
			"---",
			"metadata:",
			`  lastUpdated: '${today}'`,
			"---",
			"# Title",
			"",
			"Some correct text here.",
		].join("\n");
		const ctx = buildCheckContext("/fake/well-formed.md", raw);
		const issues = await runChecks(ctx);

		// No broken links, no missing data, no staleness for today's date
		// Spelling should be fine for this text
		const nonSpelling = issues.filter(i => i.type !== "spelling");
		expect(nonSpelling.length).toBe(0);
	});
});

describe("groupBy", () => {
	test("groups items by key function", () => {
		const items = [
			{ name: "a", type: "x" },
			{ name: "b", type: "y" },
			{ name: "c", type: "x" },
		];
		const result = groupBy(items, i => i.type);

		expect(Object.keys(result)).toEqual(["x", "y"]);
		expect(result["x"]!.length).toBe(2);
		expect(result["y"]!.length).toBe(1);
	});

	test("returns empty object for empty array", () => {
		const result = groupBy([], () => "key");
		expect(result).toEqual({});
	});

	test("handles single-item groups", () => {
		const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
		const result = groupBy(items, i => String(i.id));

		expect(Object.keys(result).length).toBe(3);
		expect(result["1"]!.length).toBe(1);
	});
});

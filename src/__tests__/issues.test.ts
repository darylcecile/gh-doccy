import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getLintIssues, severityOf, groupBy } from "../utils/issues";
import { _setCacheFile } from "../utils/cache";

const defaultCacheFilePath = path.join(process.cwd(), ".doccy", "cache.yaml");

describe("getLintIssues", () => {
	const tmpDirName = "__test_lint_issues_tmp__";
	const tmpDir = path.join(process.cwd(), tmpDirName);
	const isolatedCacheFile = path.join(tmpDir, "issues-cache.yaml");

	beforeEach(() => {
		mkdirSync(tmpDir, { recursive: true });
		// Use an isolated cache file to avoid concurrency issues
		// with other test files writing to .doccy/cache.yaml
		writeFileSync(isolatedCacheFile, "");
		_setCacheFile(isolatedCacheFile);
	});

	afterEach(() => {
		_setCacheFile(defaultCacheFilePath);
		rmSync(tmpDir, { recursive: true, force: true });
	});

	test("returns issues for markdown files matching the glob", async () => {
		const testFile = path.join(tmpDir, `test-lint-${Date.now()}.md`);
		writeFileSync(testFile, `# Hello ${Date.now()}\n\nSome text with testss word.`);

		const glob = `${tmpDirName}/**/*.md`;
		const issues = await getLintIssues(glob);

		expect(Array.isArray(issues)).toBe(true);
		expect(issues.length).toBeGreaterThan(0);
	});

	test("returns empty array when no files match glob", async () => {
		const glob = `${tmpDirName}/**/*.nonexistent`;
		const issues = await getLintIssues(glob);

		expect(Array.isArray(issues)).toBe(true);
		expect(issues.length).toBe(0);
	});

	test("caches results for subsequent calls on same files", async () => {
		const ts = Date.now();
		const testFile = path.join(tmpDir, `cached-lint-${ts}.md`);
		writeFileSync(testFile, `# Hello ${ts}\n\nSome text.`);

		const glob = `${tmpDirName}/**/*.md`;
		const issues1 = await getLintIssues(glob);
		const issues2 = await getLintIssues(glob);

		expect(issues1.length).toBe(issues2.length);
	});

	test("uses unstaged filter when unstaged option is true", async () => {
		const ts = Date.now();
		const testFile = path.join(tmpDir, `unstaged-lint-${ts}.md`);
		writeFileSync(testFile, `# Hello ${ts}\n\nSome text with testss word.`);

		const glob = `${tmpDirName}/**/*.md`;
		const issues = await getLintIssues(glob, true);

		expect(Array.isArray(issues)).toBe(true);
	});
});

describe("re-exported functions from issues.ts", () => {
	test("severityOf returns correct severity for known types", () => {
		const sev = severityOf("spelling");
		expect(["off", "warn", "error"]).toContain(sev);
	});

	test("severityOf returns 'warn' for unknown types", () => {
		expect(severityOf("nonexistent")).toBe("warn");
	});

	test("groupBy groups items correctly", () => {
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
});

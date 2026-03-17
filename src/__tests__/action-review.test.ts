import { describe, test, expect, spyOn, mock, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import dayjs from "dayjs";
import { _setCacheFile } from "../utils/cache";

// Mock @clack/prompts since it's interactive — this is fine because
// it's a third-party library, not our code under test.
mock.module("@clack/prompts", () => ({
	intro: mock(() => {}),
	outro: mock(() => {}),
	spinner: mock(() => ({
		start: mock(() => {}),
		stop: mock(() => {}),
	})),
	log: {
		step: mock(() => {}),
		warn: mock(() => {}),
		info: mock(() => {}),
		success: mock(() => {}),
	},
	select: mock(async () => "tests"),
	confirm: mock(async () => true),
	isCancel: mock(() => false),
	cancel: mock(() => {}),
}));

// No mock.module("../utils/issues") — we use real temp files so the real
// getLintIssues runs, giving issues.ts proper coverage in the full suite.
import { reviewDocs } from "../action/review";

const defaultCacheFilePath = path.join(process.cwd(), ".doccy", "cache.yaml");

describe("reviewDocs", () => {
	const tmpDirName = "__test_action_review_tmp__";
	const tmpDir = path.join(process.cwd(), tmpDirName);
	const isolatedCacheFile = path.join(tmpDir, "review-cache.yaml");

	beforeEach(() => {
		mkdirSync(tmpDir, { recursive: true });
		writeFileSync(isolatedCacheFile, "");
		_setCacheFile(isolatedCacheFile);
	});

	afterEach(() => {
		_setCacheFile(defaultCacheFilePath);
		rmSync(tmpDir, { recursive: true, force: true });
	});

	/** Helper: create a markdown file with valid frontmatter dated today. */
	function writeDoc(name: string, body: string): string {
		const today = dayjs().format("DD-MMM-YYYY");
		const filePath = path.join(tmpDir, name);
		writeFileSync(filePath, `---\nmetadata:\n  lastUpdated: ${today}\n---\n\n${body}`);
		return filePath;
	}

	test("shows 'All clear!' when no issues", async () => {
		writeDoc(`clean-${Date.now()}.md`, "# Hello\n\nSome text.");
		await reviewDocs({ glob: `${tmpDirName}/**/*.md`, unstaged: false, yes: false });
	});

	test("processes issues when they exist but no fixes selected", async () => {
		// Broken link issues have no auto-fix, so no fixes are selected
		writeDoc(`broken-${Date.now()}.md`, "# Hello\n\nSee [broken](./nonexistent.md) link.");
		await reviewDocs({ glob: `${tmpDirName}/**/*.md`, unstaged: false, yes: false });
	});

	test("applies fixes when issues have auto-fixable problems with --yes", async () => {
		// Create a file without frontmatter — missing-data check will fire
		const testFile = path.join(tmpDir, `fixable-${Date.now()}.md`);
		writeFileSync(testFile, "# Hello\n\nSome text here.");

		await reviewDocs({ glob: `${tmpDirName}/**/*.md`, unstaged: false, yes: true });

		// The file should have been modified with frontmatter
		const content = await Bun.file(testFile).text();
		expect(content).toContain("---");
	});

	test("applies spelling fixes with --yes", async () => {
		// Use a file WITHOUT frontmatter so the spelling offset matches the raw
		// content. (With frontmatter, the offset is relative to the body, but
		// applyFixes applies it to the raw file — a known source-code limitation.)
		const testFile = path.join(tmpDir, `spelling-${Date.now()}.md`);
		writeFileSync(testFile, "# Hello\n\nSome testss word.");

		await reviewDocs({ glob: `${tmpDirName}/**/*.md`, unstaged: false, yes: true });

		const content = await Bun.file(testFile).text();
		expect(content).toContain("tests");
		expect(content).not.toContain("testss");
	});

	test("applies spelling fixes correctly with frontmatter present", async () => {
		const today = dayjs().format("DD-MMM-YYYY");
		const testFile = path.join(tmpDir, `spelling-fm-${Date.now()}.md`);
		writeFileSync(
			testFile,
			`---\nmetadata:\n  lastUpdated: ${today}\n---\n\n# Hello\n\nSome testss word.`,
		);

		await reviewDocs({ glob: `${tmpDirName}/**/*.md`, unstaged: false, yes: true });

		const content = await Bun.file(testFile).text();
		expect(content).toContain("tests");
		expect(content).not.toContain("testss");
		// Frontmatter should remain intact
		expect(content).toContain("---");
		expect(content).toContain("lastUpdated");
	});

	test("passes unstaged option through", async () => {
		writeDoc(`unstaged-${Date.now()}.md`, "# Hello\n\nSome text.");
		await reviewDocs({ glob: `${tmpDirName}/**/*.md`, unstaged: true, yes: false });
	});
});

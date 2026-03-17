import { describe, test, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import dayjs from "dayjs";
import { lintDocs } from "../action/lint";
import { _setCacheFile } from "../utils/cache";

// No mock.module("../utils/issues") — we use real temp files so the real
// getLintIssues runs, giving issues.ts proper coverage in the full suite.

const defaultCacheFilePath = path.join(process.cwd(), ".doccy", "cache.yaml");

describe("lintDocs", () => {
	const tmpDirName = "__test_action_lint_tmp__";
	const tmpDir = path.join(process.cwd(), tmpDirName);
	const isolatedCacheFile = path.join(tmpDir, "lint-cache.yaml");
	let logSpy: ReturnType<typeof spyOn>;
	let exitSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		mkdirSync(tmpDir, { recursive: true });
		writeFileSync(isolatedCacheFile, "");
		_setCacheFile(isolatedCacheFile);
		logSpy = spyOn(console, "log").mockImplementation(() => {});
		exitSpy = spyOn(process, "exit").mockImplementation(() => undefined as never);
	});

	afterEach(() => {
		logSpy.mockRestore();
		exitSpy.mockRestore();
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

	test("prints 'No issues found' when there are no issues", async () => {
		writeDoc(`clean-${Date.now()}.md`, "# Hello\n\nSome text.");

		await lintDocs({ glob: `${tmpDirName}/**/*.md`, unstaged: false });

		const allOutput = logSpy.mock.calls.map((c: any) => c[0]).join("\n");
		expect(allOutput).toContain("No issues found");
		expect(exitSpy).not.toHaveBeenCalled();
	});

	test("displays issues and exits with 1 when errors exist", async () => {
		// Broken links have severity "error" in the project config
		writeDoc(`broken-${Date.now()}.md`, "# Hello\n\nSee [broken](./nonexistent.md) link.");

		await lintDocs({ glob: `${tmpDirName}/**/*.md`, unstaged: false });

		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	test("does not exit with 1 for warn-only issues", async () => {
		// Spelling has severity "warn" in the project config
		writeDoc(`warn-${Date.now()}.md`, "# Hello\n\nSome testss word.");

		await lintDocs({ glob: `${tmpDirName}/**/*.md`, unstaged: false });

		expect(exitSpy).not.toHaveBeenCalled();
	});

	test("respects --level error filter", async () => {
		// Spelling is "warn", so with level=error it should be filtered out
		writeDoc(`filter-${Date.now()}.md`, "# Hello\n\nSome testss word.");

		await lintDocs({ glob: `${tmpDirName}/**/*.md`, unstaged: false, level: "error" });

		const allOutput = logSpy.mock.calls.map((c: any) => c[0]).join("\n");
		expect(allOutput).toContain("No issues found");
	});

	test("passes unstaged option through", async () => {
		writeDoc(`unstaged-${Date.now()}.md`, "# Hello\n\nSome text.");

		// With unstaged=true, only files with unstaged git changes are checked.
		// Since our temp file is untracked (unstaged), it should still be found.
		await lintDocs({ glob: `${tmpDirName}/**/*.md`, unstaged: true });

		const allOutput = logSpy.mock.calls.map((c: any) => c[0]).join("\n");
		expect(allOutput).toContain("No issues found");
		expect(exitSpy).not.toHaveBeenCalled();
	});
});

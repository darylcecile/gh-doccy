import { describe, test, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { getUnstagedFiles, filterToUnstaged } from "../utils/git";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

describe("filterToUnstaged", () => {
	test("filters file paths to only those in the unstaged set", () => {
		const all = ["/a/b/one.md", "/a/b/two.md", "/a/b/three.md"];
		const unstaged = ["/a/b/two.md"];

		const result = filterToUnstaged(all, unstaged);
		expect(result).toEqual(["/a/b/two.md"]);
	});

	test("returns empty when no files are unstaged", () => {
		const all = ["/a/b/one.md", "/a/b/two.md"];
		const unstaged: string[] = [];

		const result = filterToUnstaged(all, unstaged);
		expect(result).toEqual([]);
	});

	test("returns all when all files are unstaged", () => {
		const all = ["/a/one.md", "/a/two.md"];
		const unstaged = ["/a/one.md", "/a/two.md"];

		const result = filterToUnstaged(all, unstaged);
		expect(result).toEqual(["/a/one.md", "/a/two.md"]);
	});
});

describe("getUnstagedFiles", () => {
	test("returns an array of strings", async () => {
		const files = await getUnstagedFiles();
		expect(Array.isArray(files)).toBe(true);
		// Each entry should be an absolute path
		for (const f of files) {
			expect(f.startsWith("/")).toBe(true);
		}
	});
});

describe("gitExec error path", () => {
	const originalCwd = process.cwd();
	const tmpDir = path.join("/tmp", `__test_git_norepo_${Date.now()}__`);

	beforeEach(() => {
		mkdirSync(tmpDir, { recursive: true });
	});

	afterEach(() => {
		// Restore original working directory first
		process.chdir(originalCwd);
		rmSync(tmpDir, { recursive: true, force: true });
	});

	test("fatal is called when git command fails in non-repo directory", async () => {
		// Mock process.exit to prevent the test runner from exiting
		const exitSpy = spyOn(process, "exit").mockImplementation(() => undefined as never);
		const errorSpy = spyOn(console, "error").mockImplementation(() => {});

		// Change to a directory outside any git repository
		process.chdir(tmpDir);

		// getUnstagedFiles -> getRepoRoot -> gitExec(["rev-parse", "--show-toplevel"])
		// This will fail because tmpDir is outside any git repo
		try {
			await getUnstagedFiles();
		} catch {
			// May throw after fatal mocks process.exit
		}

		// fatal() should have been called, which calls console.error and process.exit(1)
		expect(errorSpy).toHaveBeenCalled();
		expect(exitSpy).toHaveBeenCalledWith(1);

		exitSpy.mockRestore();
		errorSpy.mockRestore();
	});
});

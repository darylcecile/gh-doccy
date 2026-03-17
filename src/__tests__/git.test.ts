import { describe, test, expect } from "bun:test";
import { getUnstagedFiles, filterToUnstaged } from "../utils/git";

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

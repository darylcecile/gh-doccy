import { describe, test, expect } from "bun:test";
import { checkLinks } from "../utils/links";

describe("checkLinks", () => {
	test("returns no issues when there are no links", () => {
		const md = "# Title\n\nSome plain text without any links.";
		const issues = checkLinks(md, "/fake/path/doc.md");
		expect(issues).toEqual([]);
	});

	test("ignores absolute URLs", () => {
		const md = "Check out [Google](https://google.com) for more info.";
		const issues = checkLinks(md, "/fake/path/doc.md");
		expect(issues).toEqual([]);
	});

	test("ignores fragment-only links", () => {
		const md = "Jump to [section](#overview) below.";
		const issues = checkLinks(md, "/fake/path/doc.md");
		expect(issues).toEqual([]);
	});

	test("ignores mailto links", () => {
		const md = "Contact [us](mailto:test@example.com).";
		const issues = checkLinks(md, "/fake/path/doc.md");
		expect(issues).toEqual([]);
	});

	test("detects broken relative link", () => {
		const md = "See [guide](./nonexistent-file.md) for details.";
		const issues = checkLinks(md, "/fake/path/doc.md");

		expect(issues.length).toBe(1);
		expect(issues[0]!.url).toBe("./nonexistent-file.md");
		expect(issues[0]!.text).toBe("guide");
		expect(issues[0]!.line).toBeGreaterThan(0);
	});

	test("detects broken relative image", () => {
		const md = "![screenshot](./images/missing.png)";
		const issues = checkLinks(md, "/fake/path/doc.md");

		expect(issues.length).toBe(1);
		expect(issues[0]!.url).toBe("./images/missing.png");
	});

	test("does not flag existing files", () => {
		// Use a file that actually exists in the project
		const projectRoot = process.cwd();
		const md = "See [readme](../README.md) for details.";
		const issues = checkLinks(md, `${projectRoot}/docs/testing.md`);

		expect(issues).toEqual([]);
	});

	test("strips fragments from relative links before checking", () => {
		const projectRoot = process.cwd();
		const md = "See [readme](../README.md#section) for details.";
		const issues = checkLinks(md, `${projectRoot}/docs/testing.md`);

		expect(issues).toEqual([]);
	});
});

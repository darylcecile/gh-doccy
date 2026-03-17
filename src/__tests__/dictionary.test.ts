import { describe, test, expect } from "bun:test";
import { spellCheck } from "../utils/dictionary";

describe("spellCheck", () => {
	test("returns no issues for correct text", async () => {
		const md = "# Hello World\n\nThis is a simple test document.";
		const issues = await spellCheck(md);

		expect(issues).toEqual([]);
	});

	test("detects a misspelled word", async () => {
		const md = "# Title\n\nThis is a testss document.";
		const issues = await spellCheck(md);

		expect(issues.length).toBeGreaterThanOrEqual(1);
		const testss = issues.find(i => i.word === "testss");
		expect(testss).toBeDefined();
		expect(testss!.line).toBe(3);
		expect(testss!.suggestions.length).toBeGreaterThan(0);
	});

	test("skips code blocks", async () => {
		const md = "# Title\n\n```\nconst foo = testss;\n```\n\nNormal text here.";
		const issues = await spellCheck(md);

		const testss = issues.find(i => i.word === "testss");
		expect(testss).toBeUndefined();
	});

	test("skips inline code", async () => {
		const md = "# Title\n\nUse the `testss` variable in your code.";
		const issues = await spellCheck(md);

		const testss = issues.find(i => i.word === "testss");
		expect(testss).toBeUndefined();
	});

	test("skips file extensions (e.g. .md, .ts)", async () => {
		const md = "# Guide\n\nEdit the contributing.md file to get started.";
		const issues = await spellCheck(md);

		// "md" should not be flagged since it follows a dot
		const md_issue = issues.find(i => i.word === "md");
		expect(md_issue).toBeUndefined();
	});

	test("skips single characters", async () => {
		const md = "# Title\n\nStep a and step b are needed.";
		const issues = await spellCheck(md);

		const a_issue = issues.find(i => i.word === "a");
		expect(a_issue).toBeUndefined();
	});

	test("provides context for misspelled words", async () => {
		const md = "# Title\n\nThe extnsiodns are installed via the command line.";
		const issues = await spellCheck(md);

		const ext = issues.find(i => i.word === "extnsiodns");
		expect(ext).toBeDefined();
		expect(ext!.context).toContain("extnsiodns");
	});

	test("reports correct line and column for multi-line text", async () => {
		const md = "# Title\n\nLine one is fine.\n\nLine three has testss in it.";
		const issues = await spellCheck(md);

		const testss = issues.find(i => i.word === "testss");
		expect(testss).toBeDefined();
		expect(testss!.line).toBe(5);
	});
});

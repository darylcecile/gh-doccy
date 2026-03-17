import { describe, test, expect } from "bun:test";
import { parseDoc, serializeFrontMatter } from "../utils/docs";

describe("parseDoc", () => {
	test("returns null frontmatter for markdown without frontmatter", () => {
		const raw = "# Hello\n\nSome text.";
		const result = parseDoc(raw);

		expect(result.frontmatter).toBeNull();
		expect(result.content).toBe(raw);
		expect(result.frontmatterLineCount).toBe(0);
	});

	test("parses valid frontmatter with metadata", () => {
		const raw = [
			"---",
			"metadata:",
			"  lastUpdated: '2024-06-20'",
			"  tags: []",
			"---",
			"",
			"# Document",
		].join("\n");
		const result = parseDoc(raw);

		expect(result.frontmatter).not.toBeNull();
		expect(result.frontmatter!.metadata.lastUpdated).toBe("2024-06-20");
		expect(result.frontmatterLineCount).toBe(5);
	});

	test("preserves line numbers by padding body with blank lines", () => {
		const raw = [
			"---",
			"metadata:",
			"  lastUpdated: '2024-01-01'",
			"---",
			"# Title",
		].join("\n");
		const result = parseDoc(raw);

		// The content should have leading newlines equal to frontmatter line count
		const lines = result.content.split("\n");
		// Line 5 of original (index 4) is "# Title"
		expect(lines[4]).toBe("# Title");
	});

	test("handles frontmatter with optional staleness field", () => {
		const raw = [
			"---",
			"metadata:",
			"  lastUpdated: '2024-01-01'",
			"  staleness: '7d'",
			"---",
			"Body",
		].join("\n");
		const result = parseDoc(raw);

		expect(result.frontmatter!.metadata.staleness).toBe("7d");
	});

	test("handles frontmatter with description", () => {
		const raw = [
			"---",
			"description: A test document",
			"metadata:",
			"  lastUpdated: '2024-01-01'",
			"---",
			"Body",
		].join("\n");
		const result = parseDoc(raw);

		expect(result.frontmatter!.description).toBe("A test document");
	});
});

describe("serializeFrontMatter", () => {
	test("serializes frontmatter with metadata", () => {
		const fm = {
			metadata: {
				lastUpdated: "2024-01-01",
				tags: [] as string[],
			},
		};
		const result = serializeFrontMatter(fm);

		expect(result).toContain("---");
		expect(result).toContain("lastUpdated");
		expect(result.startsWith("---")).toBe(true);
		expect(result.endsWith("---")).toBe(true);
	});
});

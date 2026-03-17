import { fromMarkdown } from "mdast-util-from-markdown";
import { visit } from "unist-util-visit";
import { existsSync } from "node:fs";
import path from "node:path";

export type BrokenLinkIssue = {
	url: string;
	line: number;
	column: number;
	text: string;
}

/**
 * Checks whether a URL is a relative link (not absolute, not a protocol URL,
 * not a fragment-only link).
 */
function isRelativeLink(url: string): boolean {
	// Skip absolute URLs (http://, https://, mailto:, tel:, etc.)
	if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)) return false;
	// Skip fragment-only links (#section)
	if (url.startsWith("#")) return false;
	// Skip protocol-relative URLs (//example.com)
	if (url.startsWith("//")) return false;
	return true;
}

/**
 * Extracts relative links from markdown content and checks whether they resolve
 * to existing files on disk. Returns an array of broken link issues.
 *
 * @param markdown  The markdown body content (frontmatter already stripped)
 * @param filePath  Absolute path to the source markdown file (used to resolve relative links)
 */
export function checkLinks(markdown: string, filePath: string): BrokenLinkIssue[] {
	const tree = fromMarkdown(markdown);
	const issues: BrokenLinkIssue[] = [];
	const fileDir = path.dirname(filePath);

	visit(tree, (node) => {
		if (node.type !== "link" && node.type !== "image") return;

		const url: string = (node as any).url ?? "";
		if (!url || !isRelativeLink(url)) return;

		// Strip fragment (e.g. ./foo.md#section -> ./foo.md)
		const urlWithoutFragment = url.split("#")[0]!;
		// Strip query string (e.g. ./foo.md?ref=1 -> ./foo.md)
		const cleanUrl = urlWithoutFragment.split("?")[0]!;

		// If the URL is empty after stripping fragment/query (e.g. "#section" was
		// already filtered, but "file.md#section" becomes "file.md"), skip empty.
		if (!cleanUrl) return;

		const resolved = path.resolve(fileDir, cleanUrl);

		if (!existsSync(resolved)) {
			const startPos = node.position?.start;
			// Extract link text for display
			let text = "";
			if (node.type === "link") {
				const children = (node as any).children ?? [];
				text = children
					.filter((c: any) => c.type === "text")
					.map((c: any) => c.value)
					.join("");
			} else {
				text = (node as any).alt ?? "";
			}

			issues.push({
				url,
				line: startPos?.line ?? 0,
				column: startPos?.column ?? 0,
				text,
			});
		}
	});

	return issues;
}

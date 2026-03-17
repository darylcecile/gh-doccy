import * as Bun from "bun";
import z from "zod";
import { fatal } from "./logs";
import { parse, type StringValue } from 'ms';

const frontMatterSchema = z.object({
	description: z.string().optional(),
	metadata: z.object({
		lastUpdated: z.string().optional(),
		staleness: z.string().optional().refine(d => !d || !isNaN(parse(d)), { message: "stale must be a valid duration string, e.g. '30d', '2 weeks', etc." })  as z.ZodOptional<z.ZodType<StringValue>>,
	}).catchall(z.unknown())
});

export type FrontMatter = z.infer<typeof frontMatterSchema>;


export function serializeFrontMatter(obj: FrontMatter, indent: string = '  '): string {
	return [
		'---',
		Bun.YAML.stringify(obj, null, indent),
		'---'
	].join('\n');
}



type ParsedDoc = {
	frontmatter: FrontMatter | null;
	content: string;
	/** Number of lines occupied by the frontmatter block (including delimiters) */
	frontmatterLineCount: number;
}


const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?\r?\n)---\r?\n?/;

/**
 * Splits a markdown file into parsed frontmatter and body content.
 * The body content is padded with blank lines so line numbers stay consistent
 * with the original file.
 */
export function parseDoc(raw: string): ParsedDoc {
	const match = raw.match(FRONTMATTER_REGEX);
	if (!match) {
		return { frontmatter: null, content: raw, frontmatterLineCount: 0 };
	}

	const frontmatterYaml = match[1]!;
	const fullMatch = match[0]!;
	const frontmatterLineCount = fullMatch.split("\n").length - 1;
	const content = "\n".repeat(frontmatterLineCount) + raw.slice(fullMatch.length);

	let frontmatter: FrontMatter | null;
	try {
		frontmatter = frontMatterSchema.parse(Bun.YAML.parse(frontmatterYaml));
	} catch (err) {
		fatal(`Failed to parse frontmatter YAML: ${err}`);
	}

	return { frontmatter, content, frontmatterLineCount };
}

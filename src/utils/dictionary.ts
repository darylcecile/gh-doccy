import Spellcheck from "hunspell-spellchecker";
import { readFileSync } from "node:fs";
import { fromMarkdown } from "mdast-util-from-markdown";
import { visit, SKIP } from "unist-util-visit";
import { fatal } from "./logs";

import enGBLargeAFF from "./lang/en_GB-large.aff" with { type: "file" };
import enGBLargeDIC from "./lang/en_GB-large.dic" with { type: "file" };
import enUSLargeAFF from "./lang/en_US-large.aff" with { type: "file" };
import enUSLargeDIC from "./lang/en_US-large.dic" with { type: "file" };
import { loadConfig } from './config';
import { weakCache } from "./mem";

import SC from "@darylcecile/simple-spellchecker";
import { mkdir } from "node:fs/promises";
import { doccyBenchDir } from './cache';

const cSources = {
	"en_GB": "https://github.com/darylcecile/simple-spellchecker/raw/refs/heads/master/dict/en-GB.zip",
	"en_US": "https://github.com/darylcecile/simple-spellchecker/raw/refs/heads/master/dict/en-US.zip",
}

async function getDict(lang: "en_GB" | "en_US" = "en_US") {
	const downloadsFolder = `${doccyBenchDir}/downloads`;
	await mkdir(downloadsFolder, { recursive: true });

	switch (lang) {
		case "en_GB": {
			const p = `${downloadsFolder}/en-GB`;
			const zip = `${p}.zip`;
			const source = Bun.file(zip);
			if (await source.exists() === false) await source.write(await fetch(cSources[lang]));
			return SC.getDictionaryFromZip(zip, downloadsFolder);
		}
		case "en_US": {
			const p = `${downloadsFolder}/en-US`;
			const zip = `${p}.zip`;
			const source = Bun.file(zip);
			if (await source.exists() === false) await source.write(await fetch(cSources[lang]));
			return SC.getDictionaryFromZip(zip, downloadsFolder);
		}
		default:
			fatal(`Unsupported language: ${lang}`);
	}
}

const spellchecker = new Spellcheck();
const config = await loadConfig();

export async function getDictionary(lang: "en_GB" | "en_US" = "en_US") {
	// https://wordlist.aspell.net/dicts/
	return weakCache.passThrough(`dictionary-${lang}`, () => {
		switch (lang) {
			case "en_GB":
				return spellchecker.parse({
					aff: readFileSync(enGBLargeAFF),
					dic: readFileSync(enGBLargeDIC)
				});
			case "en_US":
				return spellchecker.parse({
					aff: readFileSync(enUSLargeAFF),
					dic: readFileSync(enUSLargeDIC)
				});
			default:
				fatal(`Unsupported language: ${lang}`);
		}
	});
}

export type SpellingIssue = {
	word: string;
	line: number;
	column: number;
	offset: number;
	context: string;
	suggestions: string[];
}

/** Node types whose text content should not be spell-checked */
const SKIP_TYPES = new Set(config.skipTypes || []);

/** Words from the user's dictionary config that should be ignored during spell-checking */
const IGNORED_WORDS = new Set((config.dictionary || []).map(w => w.toLowerCase()));

/** Number of characters to include on each side of a misspelled word for context */
const CONTEXT_RADIUS = 30;

export async function spellCheck(markdown: string): Promise<SpellingIssue[]> {
	const dictionary = await getDictionary(config.dictionaryLang);
	spellchecker.use(dictionary);

	const dict = await getDict(config.dictionaryLang);

	const tree = fromMarkdown(markdown);
	const lines = markdown.split("\n");
	const misspelledWords: SpellingIssue[] = [];

	visit(tree, (node) => {
		// Skip code blocks, inline code, and raw HTML entirely
		if (SKIP_TYPES.has(node.type)) {
			return SKIP;
		}

		if (node.type !== "text") return;

		const value = (node as { value: string }).value;
		const startPos = node.position?.start;
		if (!startPos) return;

		// Extract words, skipping anything that looks like a URL or bracket syntax
		const wordRegex = /[a-zA-Z'\u2019]+/g;
		let match: RegExpExecArray | null;

		while ((match = wordRegex.exec(value)) !== null) {
			const word = match[0];

			// Skip single characters and possessive/contraction artifacts
			if (word.length <= 1) continue;

			// Skip file extensions (e.g. "md" in "contributing.md")
			if (match.index > 0 && value[match.index - 1] === ".") continue;

			if (IGNORED_WORDS.has(word.toLowerCase())) continue;

			if (!spellchecker.check(word)) {
				// Calculate the position of this word within the document.
				// The node's start position tells us where the text node begins,
				// and match.index tells us the offset within the text node's value.
				const charOffset = match.index;

				// Count how many newlines precede this word within the text value
				const precedingText = value.slice(0, charOffset);
				const newlinesBefore = (precedingText.match(/\n/g) || []).length;
				const lastNewlineIdx = precedingText.lastIndexOf("\n");

				const line = startPos.line + newlinesBefore;
				const column = newlinesBefore === 0
					? startPos.column + charOffset
					: charOffset - lastNewlineIdx;
				const offset = startPos.offset! + charOffset;

				// Build surrounding context from the source markdown
				const lineText = lines[line - 1] ?? "";
				const colIdx = column - 1;
				const ctxStart = Math.max(0, colIdx - CONTEXT_RADIUS);
				const ctxEnd = Math.min(lineText.length, colIdx + word.length + CONTEXT_RADIUS);
				const prefix = ctxStart > 0 ? "..." : "";
				const suffix = ctxEnd < lineText.length ? "..." : "";
				const context = prefix + lineText.slice(ctxStart, ctxEnd) + suffix;

				misspelledWords.push({
					word,
					line,
					column,
					offset,
					context,
					suggestions: dict.getSuggestions(word) ?? [] //spellchecker.suggest(word, 3),
				});
			}
		}
	});

	return misspelledWords;
}

import { rmdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { fatal, info } from '../utils/logs';
import { warn } from 'node:console';
import { mkdir } from 'node:fs/promises';
import { serializeFrontMatter } from '../utils/docs';
import { initConfig } from '../utils/config';


const currentDir = process.cwd();
const docsDir = `${currentDir}/docs`;

export async function initDocs(options: { force: boolean }) {
	if (existsSync(docsDir)) {
		if (!options.force) fatal(`A 'docs' directory already exists at ${docsDir}. Use --force to overwrite.`);

		warn(`Forcing initialization. Existing 'docs' directory at ${docsDir} will be overwritten.`);
		if (statSync(docsDir).isDirectory()) {
			const result = await rmdir(docsDir).catch(err => err as Error);

			if (result instanceof Error) {
				fatal(`Failed to remove existing 'docs' directory: ${result.message}`);
			}
		}
	}

	const result = await mkdir(docsDir).catch(err => err as Error);

	if (result instanceof Error) {
		fatal(`Failed to create 'docs' directory: ${result.message}`);
	}

	await createBlankDoc('how-to-use.md');
	await createBlankDoc('contributing.md');
	await initConfig();

	console.log(`Initialized new documentation structure at ${docsDir}`);
}

async function createBlankDoc(name: string) {
	const normalizedFileName = name.endsWith('.md') ? name : `${name}.md`;
	const filePath = `${docsDir}/${normalizedFileName}`;

	if (existsSync(filePath)) {
		fatal(`A file named '${normalizedFileName}' already exists in the 'docs' directory.`);
	}

	const contentLines = [
		serializeFrontMatter({
			metadata: {
				lastUpdated: new Date().toISOString(),
				tags: []
			}
		}),
		'',
		`# ${name}`,
		'',
		'This is a blank document.'
	];

	const result = await Bun.write(filePath, contentLines.join('\n')).catch(err => err as Error);

	if (result instanceof Error) {
		fatal(`Failed to create document '${normalizedFileName}': ${result.message}`);
	}

	info(`Created new document at ${filePath}`);
}


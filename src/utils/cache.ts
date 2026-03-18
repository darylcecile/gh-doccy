import { mkdir, readFile, appendFile } from 'node:fs/promises';
import { fatal } from './logs';

const currentDir = process.cwd();
export const doccyBenchDir = `${currentDir}/.doccy`;
let cacheFile = Bun.file(`${doccyBenchDir}/cache.yaml`);

/** @internal Reset cache file reference. Only intended for use in tests. */
export function _setCacheFile(path: string) {
	cacheFile = Bun.file(path);
}

async function getContent() {
	if (await cacheFile.exists() === false) {
		await cacheFile.write('');
	}

	const cacheRaw = await cacheFile.text();
	return (Bun.YAML.parse(cacheRaw) || {}) as CacheContent;
}

// MARK: main

type CacheContent = {
	[filePath: string]: {
		hash: string;
		data?: Record<string, any>;
	}
}

export function getCacheDir() {
	return doccyBenchDir;
}

export async function ensureCacheDir() {
	try {
		await mkdir(doccyBenchDir, { recursive: true });
	} catch (err) {
		fatal(`Failed to create cache directory at ${doccyBenchDir}: ${err}`);
	}

	const gitignorePath = `${currentDir}/.gitignore`;
	const gitignoreFile = Bun.file(gitignorePath);

	if (await gitignoreFile.exists()) {
		const content = await readFile(gitignorePath, 'utf-8');
		const lines = content.split('\n').map(line => line.trim());

		if (!lines.includes('.doccy')) {
			const suffix = content.endsWith('\n') ? '' : '\n';
			await appendFile(gitignorePath, `${suffix}.doccy\n`);
		}
	}
}

export async function isCacheValid(filePath: string) {
	const fileRaw = await Bun.file(filePath).text();
	const fileHash = Bun.MD5.hash(fileRaw, 'hex');

	const cacheContent = await getContent();

	return filePath in cacheContent && cacheContent[filePath]?.hash === fileHash;
}

export async function setFileEntryResultInCache(filePath: string, result: any) {
	const fileRaw = await Bun.file(filePath).text();
	const fileHash = Bun.MD5.hash(fileRaw, 'hex');

	const cacheContent = await getContent();

	cacheContent[filePath] = {
		hash: fileHash,
		data: result,
	};

	const yamlStr = Bun.YAML.stringify(cacheContent, null, 2);
	await cacheFile.write(yamlStr);
	// Refresh the Bun.file() reference so subsequent reads see the new data.
	// (Bun.file() can return stale content from a prior reference after a write.)
	cacheFile = Bun.file(cacheFile.name!);
}

export async function getFileEntryResultFromCache(filePath: string) {
	if (await isCacheValid(filePath)) {
		const cacheContent = await getContent();
		return cacheContent[filePath]?.data || null;
	}
	return null;
}

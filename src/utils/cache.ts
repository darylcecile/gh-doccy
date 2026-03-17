import { mkdir, readFile, appendFile } from 'node:fs/promises';
import { fatal } from './logs';

const currentDir = process.cwd();
const cacheDir = `${currentDir}/.doccy`;
const cacheFile = Bun.file(`${cacheDir}/cache.yaml`);

if (await cacheFile.exists() === false) {
	await cacheFile.write('');
}

const cacheRaw = await cacheFile.text();
const cacheContent = (Bun.YAML.parse(cacheRaw) || {}) as CacheContent;

// MARK: main

type CacheContent = {
	[filePath: string]: {
		hash: string;
		data?: Record<string, any>;
	}
}

export function getCacheDir() {
	return cacheDir;
}

export async function ensureCacheDir() {
	try {
		await mkdir(cacheDir, { recursive: true });
	} catch (err) {
		fatal(`Failed to create cache directory at ${cacheDir}: ${err}`);
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

export async function isCacheValid(filePath:string) {
	const fileRaw = await Bun.file(filePath).text();
	const fileHash = Bun.MD5.hash(fileRaw, 'hex');

	return filePath in cacheContent && cacheContent[filePath]?.hash === fileHash;
}

export async function setFileEntryResultInCache(filePath: string, result: any) {
	const fileRaw = await Bun.file(filePath).text();
	const fileHash = Bun.MD5.hash(fileRaw, 'hex');

	cacheContent[filePath] = {
		hash: fileHash,
		data: result,
	};

	await cacheFile.write(Bun.YAML.stringify(cacheContent, null, 2));
}

export async function getFileEntryResultFromCache(filePath: string) {
	if (await isCacheValid(filePath)) {
		return cacheContent[filePath]?.data || null;
	}
	return null;
}

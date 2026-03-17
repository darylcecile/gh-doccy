import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { getCacheDir, ensureCacheDir, isCacheValid, setFileEntryResultInCache, getFileEntryResultFromCache, _setCacheFile } from "../utils/cache";
import { existsSync } from "node:fs";
import { mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";

const cacheDir = path.join(process.cwd(), ".doccy");
const defaultCacheFilePath = path.join(cacheDir, "cache.yaml");

describe("getCacheDir", () => {
	test("returns the cache directory path", () => {
		const dir = getCacheDir();
		expect(dir).toContain(".doccy");
		expect(typeof dir).toBe("string");
	});
});

describe("ensureCacheDir", () => {
	test("creates cache directory if it does not exist", async () => {
		await ensureCacheDir();
		const dir = getCacheDir();
		expect(existsSync(dir)).toBe(true);
	});
});

describe("cache file auto-creation", () => {
	const isolatedDir = path.join(process.cwd(), "__test_cache_autocreate_tmp__");
	const isolatedCacheFile = path.join(isolatedDir, "isolated-cache.yaml");
	const dummyDir = path.join(isolatedDir, "docs");

	beforeEach(() => {
		mkdirSync(dummyDir, { recursive: true });
		// Point cacheFile at an isolated path that doesn't exist yet
		_setCacheFile(isolatedCacheFile);
	});

	afterEach(() => {
		// Restore the default cache file reference
		_setCacheFile(defaultCacheFilePath);
		rmSync(isolatedDir, { recursive: true, force: true });
	});

	test("getContent creates cache file when it does not exist", async () => {
		expect(existsSync(isolatedCacheFile)).toBe(false);

		const dummyFile = path.join(dummyDir, `autocreate-${Date.now()}.md`);
		writeFileSync(dummyFile, "# Auto create test");

		// setFileEntryResultInCache calls getContent() which hits the
		// cacheFile.exists() === false branch (line 10) and creates the file
		await setFileEntryResultInCache(dummyFile, { test: true });

		expect(existsSync(isolatedCacheFile)).toBe(true);
	});
});

describe("cache operations", () => {
	const isolatedDir = path.join(process.cwd(), "__test_cache_ops_tmp__");
	const isolatedCacheFile = path.join(isolatedDir, "ops-cache.yaml");
	const tmpDir = path.join(isolatedDir, "docs");
	const testFile = path.join(tmpDir, "test.md");

	beforeEach(() => {
		mkdirSync(tmpDir, { recursive: true });
		writeFileSync(testFile, "# Test\n\nSome content.");
		// Use an isolated cache file for these tests
		writeFileSync(isolatedCacheFile, "");
		_setCacheFile(isolatedCacheFile);
	});

	afterEach(() => {
		_setCacheFile(defaultCacheFilePath);
		rmSync(isolatedDir, { recursive: true, force: true });
	});

	test("isCacheValid returns false for uncached file", async () => {
		const uncachedFile = path.join(tmpDir, `uncached-${Date.now()}.md`);
		writeFileSync(uncachedFile, "# Unique\n\nThis file is not cached.");
		const valid = await isCacheValid(uncachedFile);
		expect(valid).toBe(false);
	});

	test("setFileEntryResultInCache stores and getFileEntryResultFromCache retrieves data", async () => {
		const result = { issues: [{ type: "test", filePath: testFile }] };
		await setFileEntryResultInCache(testFile, result);

		const cached = await getFileEntryResultFromCache(testFile);
		expect(cached).toEqual(result);
	});

	test("isCacheValid returns true after caching file", async () => {
		await setFileEntryResultInCache(testFile, { issues: [] });
		const valid = await isCacheValid(testFile);
		expect(valid).toBe(true);
	});

	test("getFileEntryResultFromCache returns null when file content changed", async () => {
		await setFileEntryResultInCache(testFile, { issues: [{ type: "test" }] });

		writeFileSync(testFile, "# Modified\n\nDifferent content now.");

		const cached = await getFileEntryResultFromCache(testFile);
		expect(cached).toBeNull();
	});
});

describe("ensureCacheDir .gitignore handling", () => {
	const gitignorePath = path.join(process.cwd(), ".gitignore");
	let originalContent: string;

	beforeEach(() => {
		originalContent = readFileSync(gitignorePath, "utf-8");
	});

	afterEach(() => {
		writeFileSync(gitignorePath, originalContent);
	});

	test("appends .doccy to .gitignore when it is missing", async () => {
		writeFileSync(gitignorePath, "node_modules\ndist\n");

		await ensureCacheDir();

		const content = readFileSync(gitignorePath, "utf-8");
		expect(content).toContain(".doccy");
	});

	test("appends newline before .doccy when .gitignore does not end with newline", async () => {
		writeFileSync(gitignorePath, "node_modules\ndist");

		await ensureCacheDir();

		const content = readFileSync(gitignorePath, "utf-8");
		expect(content).toContain(".doccy");
		expect(content).toContain("dist\n.doccy\n");
	});
});

import { describe, test, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { loadConfig, initConfig, _resetConfigCache } from "../utils/config";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

// Note: loadConfig() has an internal cache. We use _resetConfigCache()
// to clear it between tests so each test gets a fresh loadConfig() call.

describe("loadConfig", () => {
	test("returns a config object with expected default fields", async () => {
		const config = await loadConfig();

		expect(config).toHaveProperty("skipTypes");
		expect(config).toHaveProperty("dictionaryLang");
		expect(config).toHaveProperty("dateFormat");
		expect(config).toHaveProperty("defaultStalenessThreshold");
		expect(config).toHaveProperty("strictness");
		expect(Array.isArray(config.skipTypes)).toBe(true);
	});

	test("returns cached config on subsequent calls", async () => {
		const config1 = await loadConfig();
		const config2 = await loadConfig();

		// Should be the exact same object reference due to caching
		expect(config1).toBe(config2);
	});

	test("strictness has expected keys", async () => {
		const config = await loadConfig();

		expect(config.strictness).toHaveProperty("spelling");
		expect(config.strictness).toHaveProperty("staleness");
		expect(config.strictness).toHaveProperty("missingData");
		expect(config.strictness).toHaveProperty("brokenLinks");
	});

	test("default skipTypes includes code, inlineCode, html", async () => {
		const config = await loadConfig();

		expect(config.skipTypes).toContain("code");
		expect(config.skipTypes).toContain("inlineCode");
		expect(config.skipTypes).toContain("html");
	});
});

describe("loadConfig edge cases", () => {
	const tmpDir = path.join(process.cwd(), "__test_config_edge_tmp__");

	beforeEach(() => {
		_resetConfigCache();
		mkdirSync(tmpDir, { recursive: true });
		spyOn(process, "cwd").mockReturnValue(tmpDir);
	});

	afterEach(() => {
		(process.cwd as any).mockRestore?.();
		_resetConfigCache();
		rmSync(tmpDir, { recursive: true, force: true });
	});

	test("returns default config when no config files exist (line 55)", async () => {
		// tmpDir has no .doccyrc files at all — hits the fallback at line 57
		const config = await loadConfig();

		expect(config).toHaveProperty("skipTypes");
		expect(config.dictionaryLang).toBe("en_US");
		expect(config.dateFormat).toBe("DD-MMM-YYYY");
		expect(config.defaultStalenessThreshold).toBe("30d");
	});

	test("calls fatal when config file fails validation (line 49)", async () => {
		// Write a config file that fails zod validation
		writeFileSync(
			path.join(tmpDir, ".doccyrc.yaml"),
			'dictionaryLang: "invalid_language"\n',
		);

		const exitSpy = spyOn(process, "exit").mockImplementation(() => undefined as never);
		const errorSpy = spyOn(console, "error").mockImplementation(() => {});

		const config = await loadConfig();

		// fatal() should have been called (console.error + process.exit(1))
		expect(errorSpy).toHaveBeenCalled();
		expect(exitSpy).toHaveBeenCalledWith(1);

		// After fatal (mocked), cachedConfig is still null, so loadConfig returns null
		expect(config).toBeNull();

		exitSpy.mockRestore();
		errorSpy.mockRestore();
	});
});

describe("initConfig", () => {
	const testDir = path.join(process.cwd(), "__test_config_tmp__");
	const configPath = path.join(testDir, ".doccyrc.yaml");

	beforeEach(() => {
		// Create a temp directory and override cwd
		mkdirSync(testDir, { recursive: true });
		spyOn(process, "cwd").mockReturnValue(testDir);
	});

	afterEach(() => {
		// Restore cwd and clean up
		(process.cwd as any).mockRestore?.();
		rmSync(testDir, { recursive: true, force: true });
	});

	test("creates a .doccyrc.yaml file with default config", async () => {
		const consoleSpy = spyOn(console, "log").mockImplementation(() => {});

		await initConfig();

		expect(existsSync(configPath)).toBe(true);

		const content = await Bun.file(configPath).text();
		expect(content).toContain("skipTypes");
		expect(content).toContain("dictionaryLang");
		expect(content).toContain("dateFormat");

		consoleSpy.mockRestore();
	});
});

import { describe, test, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

describe("initDocs", () => {
	const testDir = path.join(process.cwd(), "__test_init_tmp__");
	const docsDir = path.join(testDir, "docs");

	beforeEach(() => {
		mkdirSync(testDir, { recursive: true });
		spyOn(process, "cwd").mockReturnValue(testDir);
	});

	afterEach(() => {
		(process.cwd as any).mockRestore?.();
		rmSync(testDir, { recursive: true, force: true });
	});

	test("creates docs directory with files", async () => {
		const logSpy = spyOn(console, "log").mockImplementation(() => {});
		const errorSpy = spyOn(console, "error").mockImplementation(() => {});

		const { initDocs } = await import("../action/init");

		await initDocs({ force: false });

		expect(existsSync(docsDir)).toBe(true);

		logSpy.mockRestore();
		errorSpy.mockRestore();
	});

	test("exits with error when docs dir exists and force is false", async () => {
		mkdirSync(docsDir, { recursive: true });

		const errorSpy = spyOn(console, "error").mockImplementation(() => {});
		const exitSpy = spyOn(process, "exit").mockImplementation(() => undefined as never);

		const { initDocs } = await import("../action/init");

		await initDocs({ force: false });

		expect(exitSpy).toHaveBeenCalledWith(1);

		errorSpy.mockRestore();
		exitSpy.mockRestore();
	});

	test("force removes existing empty docs dir and recreates it", async () => {
		mkdirSync(docsDir, { recursive: true });

		const logSpy = spyOn(console, "log").mockImplementation(() => {});
		const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
		const errorSpy = spyOn(console, "error").mockImplementation(() => {});

		const { initDocs } = await import("../action/init");

		await initDocs({ force: true });

		expect(existsSync(docsDir)).toBe(true);

		logSpy.mockRestore();
		warnSpy.mockRestore();
		errorSpy.mockRestore();
	});

	test("calls fatal when rmdir fails on non-empty docs dir with force", async () => {
		mkdirSync(docsDir, { recursive: true });
		// rmdir only removes empty dirs; a file inside causes it to fail
		writeFileSync(path.join(docsDir, "existing.md"), "content");

		const errorSpy = spyOn(console, "error").mockImplementation(() => {});
		const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
		const exitSpy = spyOn(process, "exit").mockImplementation(() => undefined as never);

		const { initDocs } = await import("../action/init");

		await initDocs({ force: true });

		// rmdir fails on non-empty dir → fatal() → process.exit(1)
		expect(exitSpy).toHaveBeenCalledWith(1);

		errorSpy.mockRestore();
		warnSpy.mockRestore();
		exitSpy.mockRestore();
	});

	test("calls fatal when createBlankDoc finds file already exists", async () => {
		// Pre-create the docs dir with a file that createBlankDoc would try to create.
		// With process.exit mocked, execution continues past earlier fatal() calls
		// and eventually reaches the existsSync check in createBlankDoc (line 44-45).
		mkdirSync(docsDir, { recursive: true });
		writeFileSync(path.join(docsDir, "how-to-use.md"), "existing content");

		const logSpy = spyOn(console, "log").mockImplementation(() => {});
		const errorSpy = spyOn(console, "error").mockImplementation(() => {});
		const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
		const exitSpy = spyOn(process, "exit").mockImplementation(() => undefined as never);

		const { initDocs } = await import("../action/init");

		await initDocs({ force: true });

		// Should have called fatal (process.exit) multiple times:
		// once for rmdir failure, once for mkdir failure, once for file exists
		const errorOutput = errorSpy.mock.calls.map((c: any) => c[0]).join("\n");
		expect(errorOutput).toContain("how-to-use.md");

		logSpy.mockRestore();
		errorSpy.mockRestore();
		warnSpy.mockRestore();
		exitSpy.mockRestore();
	});
});

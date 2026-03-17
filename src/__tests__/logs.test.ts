import { describe, test, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { style, warn, info, sleep } from "../utils/logs";

describe("style", () => {
	test("bold wraps text with bold ANSI codes", () => {
		const result = style.bold("hello");
		expect(result).toContain("hello");
		expect(result).toContain("\x1b[1m");
		expect(result).toContain("\x1b[0m");
	});

	test("dim wraps text with dim ANSI codes", () => {
		const result = style.dim("hello");
		expect(result).toContain("hello");
		expect(result).toContain("\x1b[2m");
	});

	test("underline wraps text with underline ANSI codes", () => {
		const result = style.underline("hello");
		expect(result).toContain("hello");
		expect(result).toContain("\x1b[4m");
	});

	test("red wraps text with red ANSI codes", () => {
		const result = style.red("hello");
		expect(result).toContain("hello");
		expect(result).toContain("\x1b[31m");
	});

	test("yellow wraps text with yellow ANSI codes", () => {
		const result = style.yellow("hello");
		expect(result).toContain("hello");
		expect(result).toContain("\x1b[33m");
	});

	test("cyan wraps text with cyan ANSI codes", () => {
		const result = style.cyan("hello");
		expect(result).toContain("hello");
		expect(result).toContain("\x1b[36m");
	});

	test("magenta wraps text with magenta ANSI codes", () => {
		const result = style.magenta("hello");
		expect(result).toContain("hello");
		expect(result).toContain("\x1b[35m");
	});

	test("styles can be composed", () => {
		const result = style.bold(style.red("hello"));
		expect(result).toContain("\x1b[1m");
		expect(result).toContain("\x1b[31m");
		expect(result).toContain("hello");
	});
});

describe("fatal", () => {
	test("prints error message and exits with code 1", () => {
		const errorSpy = spyOn(console, "error").mockImplementation(() => {});
		const exitSpy = spyOn(process, "exit").mockImplementation(() => undefined as never);

		// Import fatal dynamically to avoid module-level issues
		const { fatal } = require("../utils/logs");
		fatal("something went wrong");

		expect(errorSpy).toHaveBeenCalledTimes(1);
		const msg = errorSpy.mock.calls[0]![0] as string;
		expect(msg).toContain("error:");
		expect(msg).toContain("something went wrong");

		expect(exitSpy).toHaveBeenCalledWith(1);

		errorSpy.mockRestore();
		exitSpy.mockRestore();
	});
});

describe("warn", () => {
	test("prints warning message to stderr", () => {
		const errorSpy = spyOn(console, "error").mockImplementation(() => {});

		warn("careful now");

		expect(errorSpy).toHaveBeenCalledTimes(1);
		const msg = errorSpy.mock.calls[0]![0] as string;
		expect(msg).toContain("warn:");
		expect(msg).toContain("careful now");

		errorSpy.mockRestore();
	});
});

describe("info", () => {
	test("prints info message to stderr", () => {
		const errorSpy = spyOn(console, "error").mockImplementation(() => {});

		info("just so you know");

		expect(errorSpy).toHaveBeenCalledTimes(1);
		const msg = errorSpy.mock.calls[0]![0] as string;
		expect(msg).toContain("info:");
		expect(msg).toContain("just so you know");

		errorSpy.mockRestore();
	});
});

describe("sleep", () => {
	test("returns a promise that resolves after the given ms", async () => {
		const start = Date.now();
		await sleep(50);
		const elapsed = Date.now() - start;
		expect(elapsed).toBeGreaterThanOrEqual(40); // allow some timing slack
	});
});

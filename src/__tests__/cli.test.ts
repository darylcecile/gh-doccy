import { describe, test, expect } from "bun:test";
import { cli } from "../cli";

describe("cli", () => {
	test("returns a Command instance", () => {
		const program = cli();
		expect(program).toBeDefined();
		expect(program.name()).toBe("gh doccy");
	});

	test("has init command", () => {
		const program = cli();
		const initCmd = program.commands.find(c => c.name() === "init");
		expect(initCmd).toBeDefined();
		expect(initCmd!.description()).toContain("Scaffold");
	});

	test("has lint command", () => {
		const program = cli();
		const lintCmd = program.commands.find(c => c.name() === "lint");
		expect(lintCmd).toBeDefined();
		expect(lintCmd!.description()).toContain("Check");
	});

	test("has review command", () => {
		const program = cli();
		const reviewCmd = program.commands.find(c => c.name() === "review");
		expect(reviewCmd).toBeDefined();
		expect(reviewCmd!.description()).toContain("Review");
	});

	test("lint command has --glob option with default", () => {
		const program = cli();
		const lintCmd = program.commands.find(c => c.name() === "lint");
		const globOpt = lintCmd!.options.find(o => o.long === "--glob");
		expect(globOpt).toBeDefined();
		expect(globOpt!.defaultValue).toBe("docs/**/*.md");
	});

	test("lint command has --unstaged option", () => {
		const program = cli();
		const lintCmd = program.commands.find(c => c.name() === "lint");
		const unstagedOpt = lintCmd!.options.find(o => o.long === "--unstaged");
		expect(unstagedOpt).toBeDefined();
	});

	test("lint command has --level option", () => {
		const program = cli();
		const lintCmd = program.commands.find(c => c.name() === "lint");
		const levelOpt = lintCmd!.options.find(o => o.long === "--level");
		expect(levelOpt).toBeDefined();
	});

	test("review command has --yes option", () => {
		const program = cli();
		const reviewCmd = program.commands.find(c => c.name() === "review");
		const yesOpt = reviewCmd!.options.find(o => o.long === "--yes");
		expect(yesOpt).toBeDefined();
	});

	test("init command has --force option", () => {
		const program = cli();
		const initCmd = program.commands.find(c => c.name() === "init");
		const forceOpt = initCmd!.options.find(o => o.long === "--force");
		expect(forceOpt).toBeDefined();
	});
});

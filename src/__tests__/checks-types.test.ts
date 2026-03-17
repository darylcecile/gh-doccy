import { describe, test, expect } from "bun:test";
import { defineCheck } from "../utils/checks/types";
import type { CheckAdapter } from "../utils/checks/types";

describe("defineCheck", () => {
	test("returns the same adapter object passed in", () => {
		const adapter: CheckAdapter<string> = {
			id: "test-check",
			configKey: "testCheck",
			check: () => [],
			countIssues: () => 1,
			maxLocationWidth: () => 0,
			format: () => {},
		};

		const result = defineCheck(adapter);
		expect(result).toBe(adapter);
		expect(result.id).toBe("test-check");
	});

	test("preserves all adapter properties", () => {
		const reviewFn = async () => {};
		const applyFixesFn = () => ({ content: "", applied: 0 });

		const adapter: CheckAdapter<number> = {
			id: "custom",
			configKey: "custom",
			check: () => [],
			countIssues: (d) => d,
			maxLocationWidth: () => 5,
			format: () => {},
			review: reviewFn,
			applyFixes: applyFixesFn,
		};

		const result = defineCheck(adapter);
		expect(result.review).toBe(reviewFn);
		expect(result.applyFixes).toBe(applyFixesFn);
	});
});

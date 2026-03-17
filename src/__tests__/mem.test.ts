import { describe, test, expect } from "bun:test";
import { WeakCache } from "../utils/mem";

describe("WeakCache", () => {
	test("get returns undefined for missing key", () => {
		const cache = new WeakCache();
		expect(cache.get("missing")).toBeUndefined();
	});

	test("set and get with string key", () => {
		const cache = new WeakCache();
		cache.set("key", 42);
		expect(cache.get("key")).toBe(42);
	});

	test("set and get with object key", () => {
		const cache = new WeakCache();
		const obj = {};
		cache.set(obj, "value");
		expect(cache.get(obj)).toBe("value");
	});

	test("remove deletes string key", () => {
		const cache = new WeakCache();
		cache.set("key", 1);
		cache.remove("key");
		expect(cache.get("key")).toBeUndefined();
	});

	test("remove deletes object key", () => {
		const cache = new WeakCache();
		const obj = {};
		cache.set(obj, 1);
		cache.remove(obj);
		expect(cache.get(obj)).toBeUndefined();
	});

	test("passThrough computes on first call and caches on second", () => {
		const cache = new WeakCache();
		let calls = 0;
		const compute = () => { calls++; return "result"; };

		const v1 = cache.passThrough("pt", compute);
		const v2 = cache.passThrough("pt", compute);

		expect(v1).toBe("result");
		expect(v2).toBe("result");
		expect(calls).toBe(1);
	});

	test("normalizeKey returns same symbol for same string", () => {
		const cache = new WeakCache();
		const k1 = cache.normalizeKey("a");
		const k2 = cache.normalizeKey("a");
		expect(k1).toBe(k2);
	});

	test("normalizeKey returns object as-is", () => {
		const cache = new WeakCache();
		const obj = {};
		expect(cache.normalizeKey(obj)).toBe(obj);
	});
});



export class WeakCache {
	private cache = new WeakMap<WeakKey, any>();
	private keys = new Map<string, WeakKey>();

	normalizeKey(key: object|string) {
		if (typeof key === "string") {
			if (!this.keys.has(key)) {
				this.keys.set(key, Symbol(key));
			}
			return this.keys.get(key)!;
		}
		return key;
	}

	get(key: object|string) {
		const k = this.normalizeKey(key);
		return this.cache.get(k);
	}

	set(key: object|string, value: any) {
		const k = this.normalizeKey(key);
		this.cache.set(k, value);
	}

	remove(key: object|string) {
		const k = this.normalizeKey(key);
		this.cache.delete(k);
		if (typeof key === "string") {
			this.keys.delete(key);
		}
	}

	passThrough(key: object|string, compute: () => any) {
		const k = this.normalizeKey(key);
		if (this.cache.has(k)) {
			return this.cache.get(k);
		}

		const value = compute();
		this.cache.set(k, value);
		return value;
	}
}

export let weakCache = new WeakCache();

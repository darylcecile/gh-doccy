import { fatal } from "./logs";


export async function timeFn<T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> {
	const start = performance.now();
	const result = await fn();
	const end = performance.now();
	return { result, time: end - start };
}

export function formatTime(ms: number): string {
	if (ms < 1000) return `${ms.toFixed(0)}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

export async function measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
	const { result, time } = await timeFn(fn);
	console.log(`
 [${label}] took ${formatTime(time)}
		`);
	return result;
}
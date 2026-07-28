export const __resourceRefetchers = new Set<() => Promise<any>>();
export const __resourceInflight = new Map<string, Promise<any>>();
export const __resourceLastFetchAt = new Map<string, number>();
export const __endpointBackoffUntil = new Map<string, number>();

export async function refetchAllResources(): Promise<void> {
	const fns = Array.from(__resourceRefetchers);
	await Promise.allSettled(
		fns.map((fn) => {
			try {
				return fn();
			} catch {
				return Promise.resolve();
			}
		}),
	);
}

export function registerResourceRefetch(fn: () => Promise<any>): () => void {
	__resourceRefetchers.add(fn);
	return () => {
		__resourceRefetchers.delete(fn);
	};
}

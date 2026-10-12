/** Resolves to null when `promise` rejects or takes longer than `ms`. Never rejects. */
export function settleWithin<T>(promise: Promise<T>, ms: number): Promise<T | null> {
	return new Promise((resolve) => {
		const timer = window.setTimeout(() => resolve(null), ms);
		promise.then(
			(value) => {
				window.clearTimeout(timer);
				resolve(value);
			},
			() => {
				window.clearTimeout(timer);
				resolve(null);
			},
		);
	});
}

/** A value computed per note path (from rules and the metadata cache), cached until invalidated. */
export class PerNote<T> {
	private readonly cache = new Map<string, T>();

	constructor(private readonly compute: (path: string) => T) {}

	get(path: string): T {
		if (this.cache.has(path)) return this.cache.get(path) as T;
		const value = this.compute(path);
		this.cache.set(path, value);
		return value;
	}

	invalidate(paths: ReadonlySet<string> | null): void {
		if (!paths) this.cache.clear();
		else for (const path of paths) this.cache.delete(path);
	}
}

import type { PixiTexture } from '../../pixi';

interface Entry {
	texture: Promise<PixiTexture | null>;
	/** Sprites using it; only unused textures are evicted. */
	refs: number;
}

/**
 * Loaded node images, shared by key (path + modification time + size), least recently used
 * evicted first once over the limit. Evicted and cleared textures are destroyed (GPU memory).
 */
export class TextureCache {
	private readonly entries = new Map<string, Entry>();

	constructor(private readonly limit: number) {}

	/** Take a texture (loading it the first time); give it back with `release`. */
	acquire(key: string, load: () => Promise<PixiTexture | null>): Promise<PixiTexture | null> {
		let entry = this.entries.get(key);
		if (entry) this.entries.delete(key);
		else entry = { texture: load().catch(() => null), refs: 0 };
		entry.refs++;
		this.entries.set(key, entry);
		this.evict();
		return entry.texture;
	}

	release(key: string): void {
		const entry = this.entries.get(key);
		if (entry) entry.refs = Math.max(0, entry.refs - 1);
		this.evict();
	}

	clear(): void {
		for (const entry of this.entries.values()) void entry.texture.then((texture) => texture?.destroy(true));
		this.entries.clear();
	}

	get size(): number {
		return this.entries.size;
	}

	private evict(): void {
		for (const [key, entry] of this.entries) {
			if (this.entries.size <= this.limit) return;
			if (entry.refs > 0) continue;
			this.entries.delete(key);
			void entry.texture.then((texture) => texture?.destroy(true));
		}
	}
}

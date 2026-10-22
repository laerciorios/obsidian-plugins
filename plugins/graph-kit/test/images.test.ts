import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Reader } from '../src/config/reader';
import { defaultImages, readImages } from '../src/features/images/config';
import type { ImagesConfig } from '../src/features/images/config';
import { centerSquare, imageIn, imageSourceFor, parseImageValue } from '../src/features/images/source';
import { TextureCache } from '../src/features/images/textures';
import type { PixiTexture } from '../src/pixi';
import type { NoteFacts } from '../src/rules/types';

function note(path: string, frontmatter: Record<string, unknown>): NoteFacts {
	const parts = path.split('/');
	const file = parts.pop() ?? path;
	return { path, basename: file.replace(/\.md$/, ''), folder: parts.join('/'), tags: [], frontmatter };
}

describe('image values', () => {
	test('wiki links, embeds, Markdown images, paths and URLs', () => {
		assert.deepEqual(parseImageValue('[[cover.jpg]]'), { kind: 'vault', linkpath: 'cover.jpg' });
		assert.deepEqual(parseImageValue('![[Attachments/Cover Art.PNG|200]]'), { kind: 'vault', linkpath: 'Attachments/Cover Art.PNG' });
		assert.deepEqual(parseImageValue('![poster](Attachments/My%20poster.webp)'), { kind: 'vault', linkpath: 'Attachments/My poster.webp' });
		assert.deepEqual(parseImageValue(' Attachments/cover.svg '), { kind: 'vault', linkpath: 'Attachments/cover.svg' });
		assert.deepEqual(parseImageValue('https://example.com/cover'), { kind: 'url', url: 'https://example.com/cover' });
		assert.deepEqual(parseImageValue('![](https://example.com/a.png)'), { kind: 'url', url: 'https://example.com/a.png' });
	});

	test('notes, plain text and other files are not images', () => {
		for (const text of ['[[Projects/Alpha/index]]', 'Alpha', '', '[[doc.pdf]]', 'ftp://host/a.png', 'data:image/png;base64,AAAA']) {
			assert.equal(parseImageValue(text), null, text);
		}
	});

	test('a list gives its first image', () => {
		assert.deepEqual(imageIn(['[[notes]]', 42, '[[b.png]]', '[[c.png]]']), { kind: 'vault', linkpath: 'b.png' });
		assert.equal(imageIn(null), null);
	});
});

describe('image of a note', () => {
	const config = (extra: Partial<ImagesConfig> = {}): ImagesConfig => ({ ...defaultImages(), ...extra });
	const movie = note('Catalog/dune.md', { cover: '[[dune.jpg]]', poster: '[[dune-poster.png]]', kind: 'movie' });
	const isMovie = { id: 'm', name: '', enabled: true, match: 'all' as const, conditions: [{ type: 'propertyEquals' as const, key: 'kind', value: 'movie', not: false }] };

	test('default properties in order', () => {
		assert.deepEqual(imageSourceFor(config(), movie), { kind: 'vault', linkpath: 'dune.jpg' });
		assert.deepEqual(imageSourceFor(config({ properties: ['poster', 'cover'] }), movie), { kind: 'vault', linkpath: 'dune-poster.png' });
		assert.equal(imageSourceFor(config(), note('x.md', {})), null);
	});

	test('rules: own properties, a fixed image or none', () => {
		assert.deepEqual(imageSourceFor(config({ rules: [{ ...isMovie, effect: { properties: ['poster'] } }] }), movie), { kind: 'vault', linkpath: 'dune-poster.png' });
		assert.deepEqual(imageSourceFor(config({ rules: [{ ...isMovie, effect: { image: '[[film.png]]' } }] }), movie), { kind: 'vault', linkpath: 'film.png' });
		assert.equal(imageSourceFor(config({ rules: [{ ...isMovie, effect: { none: true } }] }), movie), null);
	});

	test('the middle square of a picture', () => {
		assert.deepEqual(centerSquare(200, 300), { x: 0, y: 50, size: 200 });
		assert.deepEqual(centerSquare(400, 100), { x: 150, y: 0, size: 100 });
	});
});

describe('images config', () => {
	test('defaults: off, cover, no network', () => {
		const config = defaultImages();
		assert.equal(config.enabled, false);
		assert.deepEqual(config.properties, ['cover']);
		assert.equal(config.allowRemote, false);
	});

	test('limits are clamped and effects read', () => {
		let next = 0;
		const reader = new Reader(() => `id${++next}`);
		const config = readImages({ maxFileSizeKb: 1, textureSize: 4096, rules: [{ effect: { image: '' } }, { effect: { none: true } }, { effect: 'x' }] }, reader, 'features.images');
		assert.equal(config.maxFileSizeKb, 16);
		assert.equal(config.textureSize, 512);
		assert.deepEqual(config.rules.map((rule) => rule.effect), [{ image: '' }, { none: true }]);
		assert.deepEqual(reader.warnings, ['features.images.rules[2].effect']);
	});
});

describe('texture cache', () => {
	function fake(): PixiTexture & { destroyed: boolean } {
		const texture = { width: 1, height: 1, destroyed: false, destroy: () => (texture.destroyed = true) };
		return texture;
	}

	test('shared by key, loaded once', async () => {
		const cache = new TextureCache(10);
		let loads = 0;
		const load = () => {
			loads++;
			return Promise.resolve(fake());
		};
		const [a, b] = await Promise.all([cache.acquire('k', load), cache.acquire('k', load)]);
		assert.equal(a, b);
		assert.equal(loads, 1);
	});

	test('only unused textures are evicted, least recently used first', async () => {
		const cache = new TextureCache(1);
		const one = await cache.acquire('one', () => Promise.resolve(fake()));
		const two = await cache.acquire('two', () => Promise.resolve(fake()));
		assert.equal(cache.size, 2);
		cache.release('one');
		await Promise.resolve();
		assert.equal(cache.size, 1);
		assert.equal((one as ReturnType<typeof fake>).destroyed, true);
		assert.equal((two as ReturnType<typeof fake>).destroyed, false);
	});
});

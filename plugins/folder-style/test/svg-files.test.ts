import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { SVG_MAX_BYTES } from '../src/constants';
import type { TFile } from 'obsidian';
import { readSvg, svgFiles } from '../src/svg-files';

const LOGO = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>';

function source(text: string, size = new TextEncoder().encode(text).length) {
	let reads = 0;
	return {
		size,
		read: async () => {
			reads++;
			return text;
		},
		reads: () => reads,
	};
}

describe('reading a vault SVG', () => {
	test('a file with markup is drawn', async () => {
		assert.deepEqual(await readSvg(source(LOGO)), { ok: true, svg: LOGO });
	});

	test('no file is missing', async () => {
		assert.deepEqual(await readSvg(null), { ok: false, problem: 'missing' });
	});

	test('an empty or blank file is refused', async () => {
		assert.deepEqual(await readSvg(source('')), { ok: false, problem: 'empty' });
		assert.deepEqual(await readSvg(source(' \n\t')), { ok: false, problem: 'empty' });
	});

	test('over the limit is refused without reading it', async () => {
		const big = source(LOGO, SVG_MAX_BYTES + 1);
		assert.deepEqual(await readSvg(big), { ok: false, problem: 'too-large' });
		assert.equal(big.reads(), 0);
	});

	test('the limit itself is accepted; the text is measured in bytes too', async () => {
		const exact = 'x'.repeat(SVG_MAX_BYTES);
		assert.equal((await readSvg(source(exact))).ok, true);
		// Size on record lagging behind the file: the text read decides.
		const accents = 'é'.repeat(SVG_MAX_BYTES / 2 + 1);
		assert.deepEqual(await readSvg(source(accents, 10)), { ok: false, problem: 'too-large' });
	});
});

describe('SVG files offered by the picker', () => {
	const file = (path: string, size: number) => ({ path, extension: path.split('.').pop() ?? '', stat: { size } }) as unknown as TFile;

	test('only SVGs that can be drawn, sorted by path', () => {
		const files = [file('b/logo.svg', 900), file('a/LOGO.SVG', 10), file('a/cover.png', 10), file('a/empty.svg', 0), file('a/huge.svg', SVG_MAX_BYTES + 1), file('a/limit.svg', SVG_MAX_BYTES)];
		assert.deepEqual(svgFiles(files).map((f) => f.path), ['a/limit.svg', 'a/LOGO.SVG', 'b/logo.svg']);
	});
});

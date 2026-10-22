import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Reader } from '../src/config/reader';
import { defaultSize, readSize } from '../src/features/size/config';
import { autoDomain, numericValue, scaleSize, sizeProperty } from '../src/features/size/scale';
import type { NoteFacts } from '../src/rules/types';

const note = (frontmatter: Record<string, unknown>): NoteFacts => ({ path: 'n.md', basename: 'n', folder: '', tags: [], frontmatter });

describe('numeric values', () => {
	test('numbers, numeric text and lists', () => {
		assert.equal(numericValue(4), 4);
		assert.equal(numericValue(' 4.5 '), 4.5);
		assert.equal(numericValue('3,5'), 3.5);
		assert.equal(numericValue(['x', '2']), 2);
		for (const value of ['4 stars', '', null, true, Number.NaN, {}]) assert.equal(numericValue(value), null, String(value));
	});

	test('the vault domain', () => {
		assert.deepEqual(autoDomain([3, 1, 5]), { min: 1, max: 5 });
		assert.equal(autoDomain([]), null);
	});
});

describe('scaling', () => {
	const range = { min: 8, max: 30 };
	const domain = { min: 1, max: 5 };

	test('linear, clamped outside the domain', () => {
		assert.equal(scaleSize(1, domain, range, 'linear'), 8);
		assert.equal(scaleSize(5, domain, range, 'linear'), 30);
		assert.equal(scaleSize(3, domain, range, 'linear'), 19);
		assert.equal(scaleSize(9, domain, range, 'linear'), 30);
		assert.equal(scaleSize(-2, domain, range, 'linear'), 8);
	});

	test('square root and log grow faster at the low end', () => {
		const linear = scaleSize(2, domain, range, 'linear');
		assert.ok(scaleSize(2, domain, range, 'sqrt') > linear);
		assert.ok(scaleSize(2, domain, range, 'log') > linear);
		assert.equal(scaleSize(5, domain, range, 'log'), 30);
	});

	test('a single value gives the middle of the range', () => {
		assert.equal(scaleSize(4, { min: 4, max: 4 }, range, 'linear'), 19);
	});
});

describe('size config and rules', () => {
	const books = { id: 'b', name: '', enabled: true, match: 'all' as const, conditions: [{ type: 'propertyEquals' as const, key: 'kind', value: 'book', not: false }] };

	test('rule property, native, or the default property', () => {
		const config = { ...defaultSize(), rules: [{ ...books, effect: { property: 'pages' } }] };
		assert.equal(sizeProperty(config, note({ kind: 'book' })), 'pages');
		assert.equal(sizeProperty({ ...config, rules: [{ ...books, effect: { native: true as const } }] }, note({ kind: 'book' })), null);
		assert.equal(sizeProperty(config, note({ kind: 'movie' })), 'rating');
	});

	test('reading: swapped bounds, bad domain', () => {
		const reader = new Reader(() => 'x');
		const config = readSize({ min: 40, max: 10, scale: 'cubic', domain: { kind: 'fixed', min: 5, max: 1 } }, reader, 'features.size');
		assert.equal(config.min, 10);
		assert.equal(config.max, 40);
		assert.equal(config.scale, 'linear');
		assert.deepEqual(config.domain, { kind: 'auto' });
		assert.deepEqual(reader.warnings, ['features.size.domain', 'features.size.scale']);
		assert.deepEqual(readSize({ domain: { kind: 'fixed', min: 0, max: 10 } }, new Reader(), 'x').domain, { kind: 'fixed', min: 0, max: 10 });
	});
});

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Reader } from '../src/config/reader';
import { clampOpacity, readOpacity } from '../src/features/opacity/config';
import { readShapes } from '../src/features/shapes/config';
import { shapePoints } from '../src/features/shapes/geometry';

function center(points: number[]): [number, number] {
	let x = 0;
	let y = 0;
	for (let i = 0; i < points.length; i += 2) {
		x += points[i] ?? 0;
		y += points[i + 1] ?? 0;
	}
	const n = points.length / 2;
	return [Math.round((x / n) * 100) / 100, Math.round((y / n) * 100) / 100];
}

describe('shapes', () => {
	test('a circle needs no polygon', () => {
		assert.deepEqual(shapePoints('circle', 100, 100, 100), []);
	});

	test('vertex counts and centers', () => {
		const expected = { square: 4, diamond: 4, triangle: 3, hexagon: 6 } as const;
		for (const [shape, vertices] of Object.entries(expected) as [keyof typeof expected, number][]) {
			const points = shapePoints(shape, 100, 100, 100);
			assert.equal(points.length, vertices * 2, shape);
			assert.deepEqual(center(points), [100, 100], shape);
		}
	});

	test('the square has the circle\'s area, the diamond touches its box', () => {
		const square = shapePoints('square', 0, 0, 100);
		assert.equal(square[0], -88.6);
		assert.deepEqual(shapePoints('diamond', 0, 0, 100).slice(0, 2), [0, -100]);
	});

	test('reading shape rules', () => {
		const reader = new Reader(() => 'x');
		const config = readShapes({ enabled: true, rules: [{ id: 'a', effect: { shape: 'hexagon' } }, { id: 'b', effect: { shape: 'star' } }] }, reader, 'features.shapes');
		assert.deepEqual(config.rules.map((rule) => rule.effect), [{ shape: 'hexagon' }]);
		assert.deepEqual(reader.warnings, ['features.shapes.rules[1].effect']);
	});
});

describe('opacity', () => {
	test('values are clamped and rounded', () => {
		assert.equal(clampOpacity(0), 0.05);
		assert.equal(clampOpacity(3), 1);
		assert.equal(clampOpacity(0.333), 0.33);
	});

	test('reading opacity rules', () => {
		const reader = new Reader(() => 'x');
		const config = readOpacity({ fadeLinks: false, rules: [{ id: 'a', effect: { opacity: 0.25 } }, { id: 'b', effect: { opacity: '0.5' } }] }, reader, 'features.opacity');
		assert.equal(config.fadeLinks, false);
		assert.deepEqual(config.rules.map((rule) => rule.effect), [{ opacity: 0.25 }]);
		assert.deepEqual(reader.warnings, ['features.opacity.rules[1].effect']);
	});
});

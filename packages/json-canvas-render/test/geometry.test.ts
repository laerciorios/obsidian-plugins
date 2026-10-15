import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
	arrowPolygon,
	arrowScale,
	contentBox,
	contentInsets,
	cylinderCap,
	dashPattern,
	edgeGeometry,
	facingSide,
	shapePaths,
	sidePoint,
} from '../src/geometry';

const a = { x: 0, y: 0, width: 200, height: 100 };
const b = { x: 400, y: 0, width: 200, height: 100 };

describe('edges', () => {
	test('side points are the middle of each side', () => {
		assert.deepEqual(sidePoint(a, 'top'), { x: 100, y: 0 });
		assert.deepEqual(sidePoint(a, 'right'), { x: 200, y: 50 });
		assert.deepEqual(sidePoint(a, 'bottom'), { x: 100, y: 100 });
		assert.deepEqual(sidePoint(a, 'left'), { x: 0, y: 50 });
	});

	test('the facing side follows the direction to the other node', () => {
		assert.equal(facingSide(a, b), 'right');
		assert.equal(facingSide(b, a), 'left');
		assert.equal(facingSide(a, { x: 0, y: 300, width: 200, height: 100 }), 'bottom');
		assert.equal(facingSide(a, { x: 0, y: -300, width: 200, height: 100 }), 'top');
	});

	test('a curve like Obsidian: 7px out, control points at half the distance (70 to 150)', () => {
		const geometry = edgeGeometry(a, 'right', 'none', b, 'left', 'arrow');
		assert.deepEqual(geometry.curve.from, { x: 207, y: 50 });
		assert.deepEqual(geometry.curve.to, { x: 393, y: 50 });
		assert.deepEqual(geometry.curve.cp1, { x: 300, y: 50 });
		assert.deepEqual(geometry.curve.cp2, { x: 300, y: 50 });
		assert.equal(geometry.path, 'M200 50L207 50C300 50 300 50 393 50');
		assert.deepEqual(geometry.arrows, [{ at: { x: 400, y: 50 }, side: 'left' }]);
		assert.deepEqual(geometry.label, { x: 300, y: 50 });
	});

	test('arrows on both ends, no straight pieces', () => {
		const geometry = edgeGeometry(a, 'right', 'arrow', b, 'left', 'arrow');
		assert.equal(geometry.arrows.length, 2);
		assert.ok(geometry.path.startsWith('M207 50C'));
		const none = edgeGeometry(a, 'right', 'none', b, 'left', 'none');
		assert.ok(none.path.endsWith('L400 50'));
	});

	test('control distance is clamped', () => {
		const near = edgeGeometry(a, 'right', 'none', { x: 230, y: 0, width: 200, height: 100 }, 'left', 'arrow');
		assert.equal(near.curve.cp1.x - near.curve.from.x, 70);
		const far = edgeGeometry(a, 'right', 'none', { x: 2000, y: 0, width: 200, height: 100 }, 'left', 'arrow');
		assert.equal(far.curve.cp1.x - far.curve.from.x, 150);
	});

	test('arrowheads point at the node and grow with the width', () => {
		assert.deepEqual(arrowPolygon({ at: { x: 0, y: 0 }, side: 'bottom' }, 2), [
			{ x: 0, y: 0 },
			{ x: 6.5, y: 10.4 },
			{ x: -6.5, y: 10.4 },
		]);
		const left = arrowPolygon({ at: { x: 400, y: 50 }, side: 'left' }, 2);
		assert.ok(left.slice(1).every((point) => point.x < 400), 'the base is outside the node, on the left');
		assert.equal(arrowScale(1), 1);
		assert.equal(arrowScale(2), 1);
		assert.equal(arrowScale(8), 2.5);
	});

	test('dash patterns scale with the width', () => {
		assert.equal(dashPattern('solid', 2), null);
		assert.deepEqual(dashPattern('dashed', 2), [10, 8]);
		assert.deepEqual(dashPattern('dotted', 4), [0, 8]);
	});
});

describe('shapes', () => {
	test('every shape has a closed outline', () => {
		for (const shape of ['rectangle', 'square', 'circle', 'diamond', 'cylinder'] as const) {
			const paths = shapePaths(shape, 160, 120);
			assert.match(paths.outline, /^M.*Z$/, shape);
		}
		assert.equal(shapePaths('cylinder', 160, 120).details.length, 1, 'the cylinder rim');
	});

	test('content boxes sit inside the shape', () => {
		assert.deepEqual(contentBox('rectangle', 200, 100), { x: 0, y: 0, width: 200, height: 100 });
		assert.deepEqual(contentBox('diamond', 200, 100), { x: 50, y: 25, width: 100, height: 50 });
		const circle = contentBox('circle', 100, 100);
		const corner = { x: circle.x - 50, y: circle.y - 50 };
		assert.ok(Math.abs(Math.hypot(corner.x, corner.y) - 50) < 1e-9, 'the corners touch the circle');
		const cap = cylinderCap(160, 200);
		assert.deepEqual(contentBox('cylinder', 160, 200), { x: 0, y: cap * 2, width: 160, height: 200 - cap * 3 });
	});

	test('insets as percentages', () => {
		assert.deepEqual(contentInsets('diamond', 200, 100), [25, 25, 25, 25]);
		assert.deepEqual(contentInsets('rectangle', 200, 100), [0, 0, 0, 0]);
	});
});

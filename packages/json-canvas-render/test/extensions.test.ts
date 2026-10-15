import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
	DEFAULT_LINE_WIDTH,
	edgeStyle,
	formatVersion,
	keepsAspectRatio,
	nodeShape,
	withExtension,
	withFormatVersion,
	withLineStyle,
	withLineWidth,
	withShape,
} from '../src/extensions';

describe('reading extensions', () => {
	test('node shape defaults to rectangle', () => {
		assert.equal(nodeShape({ type: 'text' }), 'rectangle');
		assert.equal(nodeShape({ type: 'text', canvasShapes: {} }), 'rectangle');
		assert.equal(nodeShape({ type: 'text', canvasShapes: { shape: 'cylinder' } }), 'cylinder');
	});

	test('unknown values and groups fall back to rectangle', () => {
		assert.equal(nodeShape({ type: 'text', canvasShapes: { shape: 'hexagon' } }), 'rectangle');
		assert.equal(nodeShape({ type: 'text', canvasShapes: 'circle' }), 'rectangle');
		assert.equal(nodeShape({ type: 'group', canvasShapes: { shape: 'circle' } }), 'rectangle');
		assert.equal(nodeShape(null), 'rectangle');
	});

	test('edge style defaults to a solid 2px line', () => {
		assert.deepEqual(edgeStyle({}), { line: 'solid', width: DEFAULT_LINE_WIDTH });
		assert.deepEqual(edgeStyle({ canvasShapes: { line: 'dashed', width: 4 } }), { line: 'dashed', width: 4 });
	});

	test('invalid edge values fall back, extreme widths are clamped', () => {
		assert.deepEqual(edgeStyle({ canvasShapes: { line: 'wavy', width: -3 } }), { line: 'solid', width: 2 });
		assert.deepEqual(edgeStyle({ canvasShapes: { width: '4' } }), { line: 'solid', width: 2 });
		assert.equal(edgeStyle({ canvasShapes: { width: 500 } }).width, 32);
		assert.equal(edgeStyle({ canvasShapes: { width: 0.1 } }).width, 0.5);
	});

	test('format version', () => {
		assert.equal(formatVersion({ canvasShapes: { version: 1 } }), 1);
		assert.equal(formatVersion({ canvasShapes: { version: '1' } }), undefined);
		assert.equal(formatVersion({}), undefined);
	});

	test('square and circle keep the aspect ratio', () => {
		assert.deepEqual(
			(['rectangle', 'square', 'circle', 'diamond', 'cylinder'] as const).filter(keepsAspectRatio),
			['square', 'circle'],
		);
	});
});

describe('writing extensions', () => {
	test('defaults are not written', () => {
		assert.equal(withShape(undefined, 'rectangle'), undefined);
		assert.equal(withShape({ shape: 'circle' }, 'rectangle'), undefined);
		assert.equal(withLineStyle({ line: 'dotted' }, 'solid'), undefined);
		assert.equal(withLineWidth({ width: 4 }, 2), undefined);
	});

	test('values are set and unknown keys are kept', () => {
		assert.deepEqual(withShape({ future: true }, 'diamond'), { future: true, shape: 'diamond' });
		assert.deepEqual(withShape({ future: true, shape: 'circle' }, 'rectangle'), { future: true });
		assert.deepEqual(withLineStyle({ width: 4 }, 'dashed'), { width: 4, line: 'dashed' });
		assert.deepEqual(withLineWidth({ line: 'dashed' }, 8), { line: 'dashed', width: 8 });
	});

	test('invalid widths remove the key', () => {
		assert.deepEqual(withLineWidth({ line: 'dotted', width: 4 }, Number.NaN), { line: 'dotted' });
		assert.deepEqual(withLineWidth({ line: 'dotted' }, 0), { line: 'dotted' });
	});

	test('root marker', () => {
		assert.deepEqual(withFormatVersion(undefined), { version: 1 });
		assert.deepEqual(withFormatVersion({ version: 0, other: 'x' }), { version: 1, other: 'x' });
	});

	test('withExtension sets or removes the key and keeps the rest', () => {
		const node = { id: 'a', type: 'text', text: 'x', extra: 1, canvasShapes: { shape: 'circle' } };
		assert.deepEqual(withExtension(node, undefined), { id: 'a', type: 'text', text: 'x', extra: 1 });
		assert.deepEqual(withExtension(node, { shape: 'diamond' }).canvasShapes, { shape: 'diamond' });
		assert.deepEqual(node.canvasShapes, { shape: 'circle' }, 'the input is not mutated');
	});
});

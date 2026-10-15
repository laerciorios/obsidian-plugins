import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { afterMethod, detectCanvas } from '../src/canvas/internals';
import { FakeCanvas, FakeEdge, FakeNode } from './fake-canvas';

describe('detection', () => {
	const sample = (): FakeCanvas =>
		new FakeCanvas().add(new FakeNode('a', { type: 'text', text: 'A' }), new FakeEdge('e', { fromNode: 'a', toNode: 'a' }));

	test('a canvas like Obsidian 1.14 is recognized', () => {
		const result = detectCanvas({ canvas: sample() });
		assert.equal(result.ok, true);
	});

	test('missing pieces are reported, nothing is touched', () => {
		const cases: [string, (canvas: Record<string, unknown>) => void][] = [
			['nodes', (canvas) => (canvas.nodes = [])],
			['selection', (canvas) => (canvas.selection = [])],
			['data', (canvas) => (canvas.data = null)],
			['importData', (canvas) => (canvas.importData = undefined)],
			['updateSelection', (canvas) => (canvas.updateSelection = 'x')],
			['node-shape', (canvas) => (canvas.nodes as Map<string, unknown>).set('b', { id: 'b' })],
			['edge-shape', (canvas) => (canvas.edges as Map<string, unknown>).set('f', { id: 'f', getData: () => ({}) })],
			['get-data', (canvas) => (canvas.getData = () => ({ nodes: 'x' }))],
		];
		for (const [reason, breakIt] of cases) {
			const canvas = sample() as unknown as Record<string, unknown>;
			breakIt(canvas);
			assert.deepEqual(detectCanvas({ canvas }), { ok: false, reason });
		}
		assert.deepEqual(detectCanvas(null), { ok: false, reason: 'no-view' });
		assert.deepEqual(detectCanvas({}), { ok: false, reason: 'no-canvas' });
	});
});

describe('instance hooks', () => {
	test('run after the original, keep its result, isolate errors and restore', () => {
		const calls: string[] = [];
		class Target {
			value(n: number): number {
				calls.push(`original ${n}`);
				return n * 2;
			}
		}
		const target = new Target();
		const errors: unknown[] = [];
		const restore = afterMethod(
			target,
			'value',
			(args, result) => {
				calls.push(`after ${String(args[0])} → ${String(result)}`);
				throw new Error('boom');
			},
			(error) => errors.push(error),
		);
		assert.equal(target.value(3), 6);
		assert.deepEqual(calls, ['original 3', 'after 3 → 6']);
		assert.equal(errors.length, 1);
		assert.ok(Object.prototype.hasOwnProperty.call(target, 'value'), 'only the instance is patched');
		assert.notEqual(Target.prototype.value, target.value);
		restore();
		assert.ok(!Object.prototype.hasOwnProperty.call(target, 'value'));
		assert.equal(target.value(1), 2);
		assert.deepEqual(calls.slice(-1), ['original 1']);
	});

	test('a wrapper added later by someone else is left in place', () => {
		const target = { run: () => 1 };
		const restore = afterMethod(target, 'run', () => undefined, () => undefined);
		const ours = target.run;
		target.run = () => ours() + 1;
		restore();
		assert.equal(target.run(), 2);
	});

	test('missing methods cannot be hooked', () => {
		assert.throws(() => afterMethod({}, 'nope', () => undefined, () => undefined));
	});
});

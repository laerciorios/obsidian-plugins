import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { CanvasAdapterError, CanvasEditor } from '../src/canvas/editor';
import { detectCreation } from '../src/canvas/internals';
import { MEDIA_EXTENSIONS, TOOLS, TOOL_GROUPS, connection, newId, nodeAt, normalizeUrl, placementBox, tool, toolForKey } from '../src/tools/tools';
import { FakeCanvas, FakeEdge, FakeNode } from './fake-canvas';

describe('panel tools', () => {
	test('every tool is in the panel once, with its own letter', () => {
		const inPanel = TOOL_GROUPS.flat();
		assert.deepEqual([...inPanel].sort(), TOOLS.map((item) => item.id).sort());
		const keys = TOOLS.map((item) => item.key);
		assert.equal(new Set(keys).size, keys.length);
		assert.ok(!keys.includes('q'), 'Q is the lock');
	});

	test('keys pick tools like Excalidraw', () => {
		assert.equal(toolForKey('r')?.id, 'rectangle');
		assert.equal(toolForKey('D')?.id, 'diamond');
		assert.equal(toolForKey('o')?.id, 'circle');
		assert.equal(toolForKey('a')?.id, 'arrow');
		assert.equal(toolForKey('v')?.id, 'select');
		assert.equal(toolForKey('x'), undefined);
		assert.equal(toolForKey('Enter'), undefined);
	});

	test('a click centers the default size on the point', () => {
		assert.deepEqual(placementBox(tool('rectangle'), { x: 100, y: 100 }, null), { x: -20, y: 40, width: 240, height: 120 });
		assert.deepEqual(placementBox(tool('group'), { x: 0, y: 0 }, null), { x: -240, y: -160, width: 480, height: 320 });
	});

	test('a drag spans the box, in any direction', () => {
		assert.deepEqual(placementBox(tool('diamond'), { x: 10, y: 20 }, { x: 210, y: 100 }), { x: 10, y: 20, width: 200, height: 80 });
		assert.deepEqual(placementBox(tool('diamond'), { x: 210, y: 100 }, { x: 10, y: 20 }), { x: 10, y: 20, width: 200, height: 80 });
	});

	test('square and circle stay 1:1, growing toward the pointer', () => {
		assert.deepEqual(placementBox(tool('circle'), { x: 0, y: 0 }, { x: 50, y: 120 }), { x: 0, y: 0, width: 120, height: 120 });
		assert.deepEqual(placementBox(tool('square'), { x: 0, y: 0 }, { x: -30, y: -80 }), { x: -80, y: -80, width: 80, height: 80 });
		assert.deepEqual(placementBox(tool('rectangle'), { x: 0, y: 0 }, { x: 50, y: 120 }), { x: 0, y: 0, width: 50, height: 120 }, 'rectangles do not');
	});

	test('tiny drags get a minimum size', () => {
		assert.deepEqual(placementBox(tool('rectangle'), { x: 0, y: 0 }, { x: 3, y: 2 }), { x: 0, y: 0, width: 20, height: 20 });
	});

	test('the card under the pointer: topmost card, a group only when no card is there', () => {
		const nodes = [
			{ id: 'g', type: 'group', x: 0, y: 0, width: 500, height: 500 },
			{ id: 'a', type: 'text', x: 10, y: 10, width: 100, height: 100 },
			{ id: 'b', type: 'text', x: 50, y: 50, width: 100, height: 100 },
		];
		assert.equal(nodeAt(nodes, { x: 60, y: 60 })?.id, 'b');
		assert.equal(nodeAt(nodes, { x: 20, y: 20 })?.id, 'a');
		assert.equal(nodeAt(nodes, { x: 400, y: 400 })?.id, 'g');
		assert.equal(nodeAt(nodes, { x: 900, y: 900 }), null);
	});

	test('connections get the sides Obsidian picks; lines have no arrowhead', () => {
		const a = { id: 'a', x: 0, y: 0, width: 100, height: 100 };
		const b = { id: 'b', x: 300, y: 0, width: 100, height: 100 };
		assert.deepEqual(connection('e', a, b, true), { id: 'e', fromNode: 'a', fromSide: 'right', toNode: 'b', toSide: 'left', toEnd: 'arrow' });
		assert.equal(connection('e', a, b, false).toEnd, 'none');
	});

	test('ids look like Obsidian ids', () => {
		assert.match(newId(), /^[0-9a-f]{16}$/);
		assert.equal(newId(() => 0), '0000000000000000');
	});

	test('web addresses', () => {
		assert.equal(normalizeUrl('example.com/a'), 'https://example.com/a');
		assert.equal(normalizeUrl(' https://x.y '), 'https://x.y');
		assert.equal(normalizeUrl('localhost:3000'), 'https://localhost:3000');
		assert.equal(normalizeUrl('ftp://x.y'), null);
		assert.equal(normalizeUrl('dois termos'), null);
		assert.equal(normalizeUrl(''), null);
	});

	test('media files', () => {
		assert.ok(MEDIA_EXTENSIONS.has('png') && MEDIA_EXTENSIONS.has('pdf') && MEDIA_EXTENSIONS.has('mp4'));
		assert.ok(!MEDIA_EXTENSIONS.has('md') && !MEDIA_EXTENSIONS.has('canvas'));
	});
});

describe('creating connections', () => {
	const canvasWithCards = (): FakeCanvas =>
		new FakeCanvas().add(new FakeNode('a', { type: 'text', text: 'A' }), new FakeNode('b', { type: 'text', text: 'B' }));

	test('addEdge goes through importData, checks it and saves once', () => {
		const canvas = canvasWithCards();
		const editor = new CanvasEditor(canvas);
		assert.equal(editor.addEdge({ id: 'e1', fromNode: 'a', toNode: 'b', toEnd: 'none' }), 1);
		assert.equal(canvas.saves, 1);
		assert.equal(canvas.edges.get('e1')?.getData().toEnd, 'none');
		assert.equal('canvasShapes' in canvas.data, false, 'no extension, no root marker');
	});

	test('an edge with an extension marks the file', () => {
		const canvas = canvasWithCards();
		new CanvasEditor(canvas).addEdge({ id: 'e1', fromNode: 'a', toNode: 'b', canvasShapes: { line: 'dashed' } });
		assert.deepEqual(canvas.data.canvasShapes, { version: 1 });
	});

	test('missing nodes or a taken id fail before saving', () => {
		const canvas = canvasWithCards();
		const editor = new CanvasEditor(canvas);
		assert.throws(() => editor.addEdge({ id: 'e1', fromNode: 'a', toNode: 'zzz' }), CanvasAdapterError);
		canvas.edges.set('e2', new FakeEdge('e2', { fromNode: 'a', toNode: 'b' }));
		assert.throws(() => editor.addEdge({ id: 'e2', fromNode: 'a', toNode: 'b' }), CanvasAdapterError);
		assert.equal(canvas.saves, 0);
	});

	test('read-only canvases are left alone', () => {
		const canvas = canvasWithCards();
		canvas.readonly = true;
		assert.equal(new CanvasEditor(canvas).addEdge({ id: 'e1', fromNode: 'a', toNode: 'b' }), 0);
		assert.equal(canvas.edges.size, 0);
	});

	test('creation detection names what is missing', () => {
		const canvas = canvasWithCards() as unknown as Record<string, unknown>;
		assert.deepEqual(detectCreation(canvas as never), { ok: false, reason: 'scale' });
		canvas.scale = 1;
		assert.deepEqual(detectCreation(canvas as never), { ok: false, reason: 'posFromEvt' });
		for (const method of ['posFromEvt', 'panBy', 'createTextNode', 'createFileNode', 'createLinkNode', 'createGroupNode']) canvas[method] = () => undefined;
		assert.equal(detectCreation(canvas as never).ok, true);
	});
});

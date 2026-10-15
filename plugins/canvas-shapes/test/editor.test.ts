import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import Ajv2020 from 'ajv/dist/2020';
import canvasSchema from '@obsidian-plugins/json-canvas-render/schema/json-canvas-1.0.schema.json';
import shapesSchema from '@obsidian-plugins/json-canvas-render/schema/canvas-shapes-1.schema.json';
import { CanvasAdapterError, CanvasEditor, common } from '../src/canvas/editor';
import { FakeCanvas, FakeEdge, FakeNode } from './fake-canvas';

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
ajv.addSchema(canvasSchema);
const validateCanvas = ajv.getSchema(canvasSchema.$id)!;
const validateShapes = ajv.compile(shapesSchema);

function canvasWith(forgetful = false): FakeCanvas {
	return new FakeCanvas().add(
		new FakeNode('api', { type: 'text', text: 'API', width: 240, height: 120 }, forgetful),
		new FakeNode('db', { type: 'text', text: 'DB', width: 160, height: 200, future: { keep: true } }),
		new FakeNode('box', { type: 'group', label: 'Grupo', width: 600, height: 400 }),
		new FakeEdge('e', { fromNode: 'api', toNode: 'db', label: 'x' }),
	);
}

describe('selection', () => {
	test('groups are not shapeable; nodes and edges are split', () => {
		const canvas = canvasWith().select('api', 'box', 'e');
		const selected = new CanvasEditor(canvas).selected();
		assert.deepEqual(selected.nodes.map((node) => node.id), ['api']);
		assert.deepEqual(selected.edges.map((edge) => edge.id), ['e']);
	});

	test('common value', () => {
		assert.equal(common(['a', 'a']), 'a');
		assert.equal(common(['a', 'b']), null);
		assert.equal(common([]), null);
	});
});

describe('writing', () => {
	test('a shape is written through setData, saved once, with the root version', () => {
		const canvas = canvasWith();
		const editor = new CanvasEditor(canvas);
		const changed = editor.setShape([canvas.nodes.get('db')!, canvas.nodes.get('api')!], 'cylinder');
		assert.equal(changed, 2);
		assert.equal(canvas.saves, 1, 'one undo step');
		const saved = canvas.data as { canvasShapes: unknown; nodes: Record<string, unknown>[] };
		assert.deepEqual(saved.canvasShapes, { version: 1 });
		assert.deepEqual(saved.nodes.find((node) => node.id === 'db')?.canvasShapes, { shape: 'cylinder' });
		assert.deepEqual(saved.nodes.find((node) => node.id === 'db')?.future, { keep: true }, 'unknown keys survive');
		assert.equal(editor.shapeOf(canvas.nodes.get('api')!), 'cylinder');
	});

	test('square and circle become 1:1 with the larger side', () => {
		const canvas = canvasWith();
		new CanvasEditor(canvas).setShape([canvas.nodes.get('api')!], 'circle');
		const api = canvas.nodes.get('api')!;
		assert.equal(api.width, 240);
		assert.equal(api.height, 240);
	});

	test('back to rectangle removes the key; nothing to change saves nothing', () => {
		const canvas = canvasWith();
		const editor = new CanvasEditor(canvas);
		const db = canvas.nodes.get('db')!;
		editor.setShape([db], 'diamond');
		editor.setShape([db], 'rectangle');
		assert.equal('canvasShapes' in db.getData(), false);
		assert.equal(canvas.saves, 2);
		assert.equal(editor.setShape([db], 'rectangle'), 0);
		assert.equal(canvas.saves, 2);
	});

	test('groups and read-only canvases are left alone', () => {
		const canvas = canvasWith();
		assert.equal(new CanvasEditor(canvas).setShape([canvas.nodes.get('box')!], 'circle'), 0);
		canvas.readonly = true;
		assert.equal(new CanvasEditor(canvas).setShape([canvas.nodes.get('api')!], 'circle'), 0);
		assert.equal(canvas.saves, 0);
	});

	test('line style and width', () => {
		const canvas = canvasWith();
		const editor = new CanvasEditor(canvas);
		const edge = canvas.edges.get('e')!;
		editor.setLineStyle([edge], 'dotted');
		editor.setLineWidth([edge], 8);
		assert.deepEqual(edge.getData().canvasShapes, { line: 'dotted', width: 8 });
		assert.deepEqual(editor.styleOf(edge), { line: 'dotted', width: 8 });
		editor.setLineWidth([edge], 2);
		editor.setLineStyle([edge], 'solid');
		assert.equal('canvasShapes' in edge.getData(), false);
		assert.equal(edge.getData().label, 'x');
	});

	test('if Obsidian drops the value, everything is restored and nothing is saved', () => {
		const canvas = canvasWith(true);
		const editor = new CanvasEditor(canvas);
		const db = canvas.nodes.get('db')!;
		const before = db.getData();
		assert.throws(() => editor.setShape([db, canvas.nodes.get('api')!], 'circle'), CanvasAdapterError);
		assert.deepEqual(db.getData(), before, 'the first node is restored');
		assert.equal(canvas.saves, 0);
		assert.equal('canvasShapes' in canvas.data, false);
	});

	test('the saved file is valid JSON Canvas with valid extensions', () => {
		const canvas = canvasWith();
		const editor = new CanvasEditor(canvas);
		editor.setShape([canvas.nodes.get('api')!], 'square');
		editor.setShape([canvas.nodes.get('db')!], 'cylinder');
		editor.setLineStyle([canvas.edges.get('e')!], 'dashed');
		editor.setLineWidth([canvas.edges.get('e')!], 4);
		const file: unknown = JSON.parse(JSON.stringify(canvas.data));
		assert.ok(validateCanvas(file), ajv.errorsText(validateCanvas.errors));
		assert.ok(validateShapes(file), ajv.errorsText(validateShapes.errors));
	});
});

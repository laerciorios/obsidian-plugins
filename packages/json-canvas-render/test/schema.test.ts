import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import Ajv2020 from 'ajv/dist/2020';
import canvasSchema from '../schema/json-canvas-1.0.schema.json';
import shapesSchema from '../schema/canvas-shapes-1.schema.json';
import { withExtension, withFormatVersion, withLineStyle, withLineWidth, withShape } from '../src/extensions';
import { checkReferences } from './references';

// jsoncanvas-sample.canvas is the sample.canvas of https://github.com/obsidianmd/jsoncanvas (MIT).
const fixture = (name: string): Record<string, unknown> =>
	JSON.parse(readFileSync(join(process.cwd(), 'test', 'fixtures', name), 'utf8')) as Record<string, unknown>;

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
ajv.addSchema(canvasSchema);
const validateCanvas = ajv.getSchema(canvasSchema.$id)!;
const validateShapes = ajv.compile(shapesSchema);

function assertValid(data: unknown, name: string): void {
	assert.ok(validateCanvas(data), `${name} is JSON Canvas 1.0: ${ajv.errorsText(validateCanvas.errors)}`);
	assert.ok(validateShapes(data), `${name} has valid extensions: ${ajv.errorsText(validateShapes.errors)}`);
	checkReferences(data);
}

describe('schemas', () => {
	test('the official sample and the shapes fixture are valid', () => {
		assertValid(fixture('jsoncanvas-sample.canvas'), 'jsoncanvas sample');
		assertValid(fixture('shapes.canvas'), 'shapes fixture');
	});

	test('a canvas written by the extension helpers is valid', () => {
		const sample = fixture('jsoncanvas-sample.canvas');
		const shapes = ['square', 'circle', 'diamond', 'cylinder', 'rectangle'] as const;
		const nodes = (sample.nodes as Record<string, unknown>[]).map((node, index) =>
			withExtension(node, withShape(node.canvasShapes, shapes[index % shapes.length] ?? 'rectangle')),
		);
		const edges = (sample.edges as Record<string, unknown>[]).map((edge) =>
			withExtension(edge, withLineWidth(withLineStyle(edge.canvasShapes, 'dotted'), 4)),
		);
		const written = withExtension({ ...sample, nodes, edges }, withFormatVersion(sample.canvasShapes));
		assertValid(written, 'written canvas');
		assert.deepEqual((written.edges as Record<string, unknown>[])[0]?.canvasShapes, { line: 'dotted', width: 4 });
	});

	test('the JSON Canvas schema rejects what the spec forbids', () => {
		const node = { id: 'a', type: 'text', text: 'x', x: 0, y: 0, width: 10, height: 10 };
		assert.ok(!validateCanvas({ nodes: [{ ...node, x: 1.5 }] }), 'positions are integers');
		assert.ok(!validateCanvas({ nodes: [{ ...node, type: 'image' }] }), 'unknown node type');
		assert.ok(!validateCanvas({ nodes: [{ id: 'f', type: 'file', x: 0, y: 0, width: 1, height: 1 }] }), 'file without file');
		assert.ok(!validateCanvas({ nodes: [{ ...node, color: 'red' }] }), 'color names are not colors');
		assert.ok(!validateCanvas({ edges: [{ id: 'e', fromNode: 'a', toNode: 'b', toSide: 'middle' }] }), 'unknown side');
		assert.ok(validateCanvas({ nodes: [{ ...node, color: '#FF0000', anything: { goes: true } }] }), 'unknown keys are allowed');
	});

	test('the extensions schema rejects invalid values', () => {
		const node = { id: 'a', type: 'text', text: 'x', x: 0, y: 0, width: 10, height: 10 };
		const edge = { id: 'e', fromNode: 'a', toNode: 'a' };
		assert.ok(!validateShapes({ nodes: [{ ...node, canvasShapes: { shape: 'hexagon' } }] }), 'unknown shape');
		assert.ok(!validateShapes({ nodes: [{ ...node, canvasShapes: 'circle' }] }), 'extension must be an object');
		assert.ok(!validateShapes({ nodes: [node], edges: [{ ...edge, canvasShapes: { line: 'wavy' } }] }), 'unknown line');
		assert.ok(!validateShapes({ nodes: [node], edges: [{ ...edge, canvasShapes: { width: 0 } }] }), 'width must be positive');
		assert.ok(!validateShapes({ canvasShapes: {} }), 'the root marker needs a version');
		assert.ok(!validateShapes({ nodes: [{ ...node, x: 0.5, canvasShapes: { shape: 'circle' } }] }), 'still JSON Canvas');
		assert.ok(validateShapes({ canvasShapes: { version: 1, later: 'ok' }, nodes: [{ ...node, canvasShapes: { shape: 'circle', later: 1 } }] }));
	});
});

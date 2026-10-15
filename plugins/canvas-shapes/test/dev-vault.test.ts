import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import Ajv2020 from 'ajv/dist/2020';
import canvasSchema from '@obsidian-plugins/json-canvas-render/schema/json-canvas-1.0.schema.json';
import shapesSchema from '@obsidian-plugins/json-canvas-render/schema/canvas-shapes-1.schema.json';

/** The test canvases of the dev vault are what the plugin writes: they must pass both schemas. */
describe('dev-vault canvases', () => {
	const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
	ajv.addSchema(canvasSchema);
	const validateCanvas = ajv.getSchema(canvasSchema.$id)!;
	const validateShapes = ajv.compile(shapesSchema);
	const folder = join(process.cwd(), '..', '..', 'dev-vault', 'Canvas Shapes');
	const files = readdirSync(folder).filter((name) => name.endsWith('.canvas'));

	test('there are test canvases', () => assert.ok(files.length >= 3));

	for (const name of files) {
		test(name, () => {
			const data: unknown = JSON.parse(readFileSync(join(folder, name), 'utf8'));
			assert.ok(validateCanvas(data), ajv.errorsText(validateCanvas.errors));
			assert.ok(validateShapes(data), ajv.errorsText(validateShapes.errors));
		});
	}
});

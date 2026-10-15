import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import Ajv2020 from 'ajv/dist/2020';
import canvasSchema from '@obsidian-plugins/json-canvas-render/schema/json-canvas-1.0.schema.json';
import shapesSchema from '@obsidian-plugins/json-canvas-render/schema/canvas-shapes-1.schema.json';
import { assetFileName, makePortable, notesToRead } from '../src/export/portable';
import type { PortableOptions } from '../src/export/portable';

const VAULT = ['Attachments/canvas-shapes-horta.png', 'Attachments/canvas-shapes-textura.png', 'Canvas Shapes/irrigacao.md', 'Docs/Relatório Final.pdf', 'Fotos/horta.png'];
const NOTE = '---\ntags: [x]\n---\n# Irrigação\n\nVeja ![[canvas-shapes-horta.png|200]] e [[Relatório Final.pdf|o relatório]].\n\n## Regras\n\n- regar\n\n```\n![[não-mexer.png]]\n```\n';

/** Obsidian-like resolution: exact path, else by file name (with or without .md). */
const resolve: PortableOptions['resolve'] = (target) => {
	if (VAULT.includes(target)) return target;
	const name = target.split('/').pop() ?? target;
	return VAULT.find((path) => path.endsWith(`/${name}`) || path.endsWith(`/${name}.md`)) ?? null;
};

const options = (notes: 'text' | 'link'): PortableOptions => ({
	notes,
	noteUrl: (path) => `https://example.com/${encodeURIComponent(path)}`,
	resolve,
	noteText: (path) => (path === 'Canvas Shapes/irrigacao.md' ? NOTE : null),
});

const fixture = JSON.parse(
	readFileSync(join(process.cwd(), '..', '..', 'dev-vault', 'Canvas Shapes', 'exportacao.canvas'), 'utf8'),
) as { nodes: Record<string, unknown>[] };

const node = (canvas: Record<string, unknown>, id: string): Record<string, unknown> =>
	(canvas.nodes as Record<string, unknown>[]).find((item) => item.id === id) ?? {};

describe('portable canvas', () => {
	test('asset names are URL-safe', () => {
		assert.equal(assetFileName('Docs/Relatório Final.pdf'), 'Relatorio-Final.pdf');
		assert.equal(assetFileName('a/Foto (1).PNG'), 'Foto-1.png');
		assert.equal(assetFileName('???'), 'file');
	});

	test('files are copied to assets/ and paths rewritten', () => {
		const { canvas, assets } = makePortable(fixture, 'Canvas Shapes/exportacao.canvas', options('text'));
		assert.equal(node(canvas, 'foto').file, 'assets/canvas-shapes-horta.png');
		assert.equal(node(canvas, 'canteiro').background, 'assets/canvas-shapes-textura.png');
		assert.deepEqual([...assets.keys()].sort(), ['Attachments/canvas-shapes-horta.png', 'Attachments/canvas-shapes-textura.png', 'Docs/Relatório Final.pdf']);
	});

	test('notes as text: frontmatter dropped, subpath kept, links inside rewritten, code untouched', () => {
		const { canvas } = makePortable(fixture, 'Canvas Shapes/exportacao.canvas', options('text'));
		const nota = node(canvas, 'nota');
		assert.equal(nota.type, 'text');
		assert.equal(nota.file, undefined);
		assert.match(String(nota.text), /^# Irrigação/);
		assert.match(String(nota.text), /!\[canvas-shapes-horta\.png\]\(assets\/canvas-shapes-horta\.png\)/);
		assert.match(String(nota.text), /\[o relatório\]\(assets\/Relatorio-Final\.pdf\)/);
		assert.match(String(nota.text), /!\[\[não-mexer\.png\]\]/, 'code blocks are left alone');
		const regras = node(canvas, 'regras');
		assert.match(String(regras.text), /^## Regras/);
		assert.deepEqual(regras.canvasShapes, { shape: 'circle' }, 'extensions and color stay');
		assert.equal(regras.color, '6');
	});

	test('notes as links', () => {
		const { canvas } = makePortable(fixture, 'Canvas Shapes/exportacao.canvas', options('link'));
		assert.equal(node(canvas, 'nota').text, '[irrigacao](https://example.com/Canvas%20Shapes%2Firrigacao.md)');
		assert.equal(node(canvas, 'regras').text, '[irrigacao > Regras](https://example.com/Canvas%20Shapes%2Firrigacao.md)');
		assert.match(String(node(canvas, 'texto').text), /\[a nota de irrigação\]\(https:\/\/example\.com\//);
	});

	test('text cards: wikilinks become text, embeds become assets, missing files become their name', () => {
		const data = {
			nodes: [
				{ id: 't', type: 'text', text: 'Ver [[irrigacao]], [[Sumiu]], ![[horta.png]], [site](https://x.y) e `[[code]]`.', x: 0, y: 0, width: 10, height: 10 },
				{ id: 'm', type: 'file', file: 'Nada/sumiu.png', x: 0, y: 0, width: 10, height: 10 },
			],
		};
		const { canvas, assets } = makePortable(data, 'c.canvas', options('text'));
		assert.equal(node(canvas, 't').text, 'Ver irrigacao, Sumiu, ![horta.png](assets/horta.png), [site](https://x.y) e `[[code]]`.');
		assert.deepEqual(node(canvas, 'm'), { id: 'm', type: 'text', text: '*sumiu.png*', x: 0, y: 0, width: 10, height: 10 });
		assert.deepEqual([...assets.values()], ['assets/horta.png']);
	});

	test('two files with the same name get different assets', () => {
		const data = {
			nodes: [
				{ id: 'a', type: 'file', file: 'Fotos/horta.png', x: 0, y: 0, width: 10, height: 10 },
				{ id: 'b', type: 'file', file: 'Attachments/canvas-shapes-horta.png', x: 0, y: 0, width: 10, height: 10 },
				{ id: 'c', type: 'text', text: '![[Fotos/horta.png]]', x: 0, y: 0, width: 10, height: 10 },
			],
		};
		const local: PortableOptions = { ...options('text'), resolve: (target) => (VAULT.includes(target) ? target : null) };
		const extra = makePortable({ nodes: [...data.nodes, { id: 'd', type: 'file', file: 'Docs/Relatório Final.pdf', x: 0, y: 0, width: 1, height: 1 }] }, 'c.canvas', local);
		assert.equal(node(extra.canvas, 'a').file, 'assets/horta.png');
		assert.equal(node(extra.canvas, 'b').file, 'assets/canvas-shapes-horta.png');
		assert.equal(node(extra.canvas, 'c').text, '![horta.png](assets/horta.png)', 'the same file is copied once');
	});

	test('the notes to read', () => {
		assert.deepEqual(notesToRead(fixture, 'Canvas Shapes/exportacao.canvas', resolve), ['Canvas Shapes/irrigacao.md']);
	});

	test('canvas.json is valid and points only inside the export folder', () => {
		const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
		ajv.addSchema(canvasSchema);
		const validate = ajv.compile(shapesSchema);
		for (const notes of ['text', 'link'] as const) {
			const { canvas } = makePortable(fixture, 'Canvas Shapes/exportacao.canvas', options(notes));
			assert.ok(validate(canvas), ajv.errorsText(validate.errors));
			for (const item of canvas.nodes as Record<string, unknown>[]) {
				for (const key of ['file', 'background']) {
					if (typeof item[key] === 'string') assert.match(item[key], /^assets\//, `${String(item.id)}.${key}`);
				}
			}
		}
	});
});

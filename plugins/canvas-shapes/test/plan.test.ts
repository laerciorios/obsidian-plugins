import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { bytesToBase64, fitScale, imageType, isMarkdown, referencedFiles, safeFileName, selectionIds } from '../src/export/plan';

const data = {
	nodes: [
		{ id: 'g', type: 'group', x: 0, y: 0, width: 500, height: 300, background: 'Attachments/fundo.png' },
		{ id: 'in', type: 'text', text: 'dentro', x: 20, y: 20, width: 100, height: 100 },
		{ id: 'img', type: 'file', file: 'Attachments/foto.JPG', x: 200, y: 20, width: 100, height: 100 },
		{ id: 'out', type: 'file', file: 'Notas/fora.md', x: 600, y: 0, width: 100, height: 100 },
		{ id: 'again', type: 'file', file: 'Attachments/foto.JPG', x: 800, y: 0, width: 100, height: 100 },
	],
	edges: [{ id: 'e', fromNode: 'in', toNode: 'out' }],
};

describe('export plan', () => {
	test('files used by the canvas', () => {
		assert.deepEqual(referencedFiles(data), ['Attachments/fundo.png', 'Attachments/foto.JPG', 'Notas/fora.md']);
	});

	test('file kinds', () => {
		assert.equal(imageType('Attachments/foto.JPG'), 'image/jpeg');
		assert.equal(imageType('a/b.svg'), 'image/svg+xml');
		assert.equal(imageType('Notas/fora.md'), null);
		assert.equal(imageType('sem-extensao'), null);
		assert.ok(isMarkdown('Notas/fora.md') && !isMarkdown('x.pdf'));
	});

	test('a selected group brings what is inside it', () => {
		assert.deepEqual(selectionIds(data, ['g']).sort(), ['g', 'img', 'in']);
		assert.deepEqual(selectionIds(data, ['out', 'e']).sort(), ['e', 'out']);
	});

	test('PNG scale fits the browser limits', () => {
		assert.equal(fitScale(1000, 800, 2), 2);
		assert.equal(fitScale(10000, 1000, 3), 16384 / 10000);
		assert.ok(fitScale(16000, 16000, 1) * 16000 * fitScale(16000, 16000, 1) * 16000 <= 268_000_000 + 1);
	});

	test('file names', () => {
		assert.equal(safeFileName('Plano: fase #2 / final?'), 'Plano fase 2 final');
		assert.equal(safeFileName('///'), 'canvas');
	});

	test('base64', () => {
		assert.equal(bytesToBase64(new TextEncoder().encode('Olá, canvas').buffer as ArrayBuffer), Buffer.from('Olá, canvas').toString('base64'));
	});
});

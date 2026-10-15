import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { renderCanvas } from '../src/render';
import { assertWellFormed } from './xml';

const fixture = (name: string): unknown => JSON.parse(readFileSync(join(process.cwd(), 'test', 'fixtures', name), 'utf8'));

describe('render', () => {
	const shapes = fixture('shapes.canvas');

	test('the drawing is a well-formed SVG with everything in it', () => {
		const { svg, width, height } = renderCanvas(shapes, { theme: 'light', background: 'solid' });
		assertWellFormed(svg);
		assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
		assert.ok(width > 1000 && height > 400);
		for (const id of ['g1', 'user', 'api', 'queue', 'check', 'db', 'doc', 'site', 'e1', 'e2', 'e3', 'e4', 'e5']) {
			assert.ok(svg.includes(`data-id="${id}"`), `draws ${id}`);
		}
		assert.ok(svg.includes('Plataforma Nimbus'));
		assert.ok(svg.includes('stroke-dasharray="10 8"'), 'dashed line');
		assert.ok(svg.includes('stroke-dasharray="0 8"') && svg.includes('stroke-linecap="round"'), 'dotted 4px line');
		assert.ok(svg.includes('stroke-width="8"'), '8px line');
		assert.ok(svg.includes('stroke="#e93147"'), 'preset color 1 on the dotted edge');
		assert.ok(svg.includes('font-weight="700"'), 'bold text');
		assert.ok(svg.includes('text-decoration="line-through"'), 'strike');
		assert.ok(svg.includes('A80 80 0 1 1'), 'circle outline');
	});

	test('themes change the colors', () => {
		const light = renderCanvas(shapes, { theme: 'light', background: 'solid' }).svg;
		const dark = renderCanvas(shapes, { theme: 'dark', background: 'solid' }).svg;
		assert.ok(light.includes('fill="#ffffff"'));
		assert.ok(dark.includes('fill="#1c1c1c"'));
		assert.ok(dark.includes('stroke="#fb464c"'), 'dark red');
	});

	test('transparent background by default', () => {
		const { svg, viewBox } = renderCanvas(shapes);
		assert.ok(!svg.includes(`<rect x="${viewBox.x}" y="${viewBox.y}"`));
	});

	test('only the chosen nodes, with the edges between them', () => {
		const { svg } = renderCanvas(shapes, { only: ['queue', 'db'] });
		assertWellFormed(svg);
		assert.ok(svg.includes('data-id="queue"') && svg.includes('data-id="db"') && svg.includes('data-id="e4"'));
		assert.ok(!svg.includes('data-id="api"') && !svg.includes('data-id="e2"'));
	});

	test('files: images, notes and missing files', () => {
		const data = {
			nodes: [
				{ id: 'img', type: 'file', file: 'Attachments/logo.png', x: 0, y: 0, width: 100, height: 100 },
				{ id: 'note', type: 'file', file: 'Notas/ideia.md', subpath: '#Resumo', x: 200, y: 0, width: 300, height: 200 },
				{ id: 'gone', type: 'file', file: 'Notas/sumiu.pdf', x: 600, y: 0, width: 200, height: 100 },
				{ id: 'grp', type: 'group', x: -50, y: -100, width: 900, height: 400, background: 'Attachments/fundo.png', backgroundStyle: 'repeat' },
			],
		};
		const { svg } = renderCanvas(data, {
			resolveFile: (path) => {
				if (path.endsWith('.png')) return { kind: 'image', href: `assets/${path.split('/').pop()}`, width: 32, height: 32 };
				if (path.endsWith('.md')) return { kind: 'markdown', text: '---\na: 1\n---\n# Intro\nfora\n# Resumo\ndentro & <ok>' };
				return undefined;
			},
		});
		assertWellFormed(svg);
		assert.ok(svg.includes('href="assets/logo.png"') && svg.includes('xlink:href="assets/logo.png"'));
		assert.ok(svg.includes('dentro &amp;') && !svg.includes('fora'), 'the #Resumo section, escaped, without HTML');
		assert.ok(svg.includes('sumiu.pdf'));
		assert.ok(svg.includes('<pattern'), 'repeated group background');
	});

	test('broken entries are skipped instead of failing', () => {
		const { svg } = renderCanvas({
			nodes: [{ id: 'ok', type: 'text', text: 'x', x: 0, y: 0, width: 10, height: 10 }, { id: 'bad', type: 'text', x: 'a' }, { type: 'unknown' }, 7],
			edges: [{ id: 'e', fromNode: 'ok', toNode: 'missing' }, null],
		});
		assertWellFormed(svg);
		assert.ok(svg.includes('data-id="ok"') && !svg.includes('data-id="bad"') && !svg.includes('data-id="e"'));
		assertWellFormed(renderCanvas(null).svg);
	});

	test('links: safe schemes and relative paths only', () => {
		const { svg } = renderCanvas({
			nodes: [
				{ id: 'a', type: 'text', text: '[ok](https://x.y) [nota](obsidian://open?file=a) [pdf](assets/a.pdf) [mal](javascript:alert(1)) [[Interna]]', x: 0, y: 0, width: 900, height: 100 },
				{ id: 'b', type: 'link', url: 'javascript:alert(1)', x: 0, y: 200, width: 100, height: 100 },
			],
		});
		assert.ok(svg.includes('href="https://x.y"') && svg.includes('href="obsidian://open?file=a"') && svg.includes('href="assets/a.pdf"'));
		assert.ok(!svg.includes('href="javascript'), 'no script links');
		assert.ok(!svg.includes('href="Interna"'), 'internal links are not anchors');
	});

	test('text is escaped', () => {
		const { svg } = renderCanvas({ nodes: [{ id: 'x"<', type: 'text', text: 'a < b & "c"\u0007', x: 0, y: 0, width: 300, height: 100 }] });
		assertWellFormed(svg);
		assert.ok(svg.includes('a &lt; b &amp; &quot;c&quot;'));
	});
});

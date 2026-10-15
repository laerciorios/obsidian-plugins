import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { renderCanvas } from '../src/render';
import { viewerPage, viewerRuntime } from '../src/viewer';
import { assertWellFormed } from './xml';

describe('viewer page', () => {
	const data = { nodes: [{ id: 'a', type: 'text', text: 'Olá <mundo> & "aspas"', x: 0, y: 0, width: 200, height: 100 }] };
	const light = renderCanvas(data, { theme: 'light', idPrefix: 'l-' });
	const dark = renderCanvas(data, { theme: 'dark', idPrefix: 'd-' });
	const html = viewerPage({
		title: 'Plano <teste>',
		lang: 'pt-BR',
		light: light.svg,
		dark: dark.svg,
		width: light.width,
		height: light.height,
		theme: 'system',
		labels: { zoomIn: 'Ampliar', zoomOut: 'Reduzir', fit: 'Ajustar', theme: 'Tema' },
	});

	test('inlines both themes, escaped title and the labels', () => {
		assert.ok(html.startsWith('<!doctype html>'));
		assert.ok(html.includes('<title>Plano &lt;teste&gt;</title>'));
		assert.ok(html.includes('class="jc-light"><svg') && html.includes('class="jc-dark"><svg'));
		assert.ok(html.includes('aria-label="Ajustar"'));
		assert.ok(html.includes(`data-width="${light.width}"`));
		for (const svg of [light.svg, dark.svg]) assertWellFormed(svg);
	});

	test('the runtime is self-contained and parses as a script', () => {
		const source = viewerRuntime.toString();
		assert.doesNotMatch(source, /\b(THEMES|escapeXml|__name|require|import)\b/);
		const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1] ?? '');
		assert.equal(scripts.length, 2);
		for (const script of scripts) assert.doesNotThrow(() => new Function(script));
	});

	test('the runtime does nothing without its elements', () => {
		const globals = globalThis as unknown as { document?: unknown };
		const before = globals.document;
		globals.document = { documentElement: { dataset: {} }, getElementById: () => null };
		try {
			assert.doesNotThrow(() => viewerRuntime());
		} finally {
			globals.document = before;
		}
	});
});

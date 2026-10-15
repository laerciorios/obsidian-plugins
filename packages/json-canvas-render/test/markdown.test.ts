import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { layoutMarkdown } from '../src/layout';
import { extractSubpath, linkTitle, parseInline, parseMarkdown, stripFrontmatter } from '../src/markdown';
import { approximateMeasurer } from '../src/measure';

describe('inline Markdown', () => {
	test('emphasis, strike, highlight and code', () => {
		assert.deepEqual(parseInline('a **b** *c* ~~d~~ ==e== `f`'), [
			{ text: 'a ', style: {} },
			{ text: 'b', style: { bold: true } },
			{ text: ' ', style: {} },
			{ text: 'c', style: { italic: true } },
			{ text: ' ', style: {} },
			{ text: 'd', style: { strike: true } },
			{ text: ' ', style: {} },
			{ text: 'e', style: { highlight: true } },
			{ text: ' ', style: {} },
			{ text: 'f', style: { code: true } },
		]);
	});

	test('nested emphasis', () => {
		assert.deepEqual(parseInline('***x***'), [{ text: 'x', style: { bold: true, italic: true } }]);
	});

	test('links, wikilinks, URLs and embeds', () => {
		assert.deepEqual(parseInline('[site](https://example.com)'), [{ text: 'site', style: { link: 'https://example.com' } }]);
		assert.deepEqual(parseInline('[[Pasta/Nota#Seção|apelido]]'), [{ text: 'apelido', style: { link: 'Pasta/Nota#Seção', internal: true } }]);
		assert.deepEqual(parseInline('[[Pasta/Nota#Seção]]'), [{ text: 'Nota > Seção', style: { link: 'Pasta/Nota#Seção', internal: true } }]);
		assert.deepEqual(parseInline('veja https://example.com/a.'), [
			{ text: 'veja ', style: {} },
			{ text: 'https://example.com/a', style: { link: 'https://example.com/a' } },
			{ text: '.', style: {} },
		]);
		assert.deepEqual(parseInline('![[Attachments/diagrama.png|300]]'), [{ text: 'diagrama.png', style: { muted: true, italic: true } }]);
	});

	test('escapes, entities, HTML and snake_case', () => {
		assert.deepEqual(parseInline('\\*não\\* &amp; <b>x</b> snake_case_name'), [{ text: '*não* & x snake_case_name', style: {} }]);
	});

	test('tags', () => {
		assert.deepEqual(parseInline('#ideia e #2026 e a#b'), [
			{ text: '#ideia', style: { tag: true } },
			{ text: ' e #2026 e a#b', style: {} },
		]);
	});

	test('link titles', () => {
		assert.equal(linkTitle('Projetos/Nimbus/arquitetura.md'), 'arquitetura');
		assert.equal(linkTitle('#Seção'), 'Seção');
	});
});

describe('blocks', () => {
	test('headings, lists, tasks, quotes, code, rules and tables', () => {
		const blocks = parseMarkdown(
			['# Título', 'linha 1', 'linha 2', '', '- a', '  - b', '1. c', '- [x] feito', '> citação', '```', 'code', '```', '---', '| x | y |', '|---|---|', '| 1 | 2 |'].join('\n'),
		);
		assert.deepEqual(
			blocks.map((block) => [block.kind, block.level ?? block.depth ?? block.quote ?? null]),
			[
				['heading', 1],
				['paragraph', 0],
				['item', 0],
				['item', 1],
				['item', 0],
				['item', 0],
				['paragraph', 1],
				['code', 0],
				['rule', 0],
				['table', 0],
				['table', 0],
			],
		);
		assert.deepEqual(blocks[1]?.runs.map((run) => run.text), ['linha 1', '\n', 'linha 2']);
		assert.equal(blocks[2]?.marker, '•');
		assert.equal(blocks[3]?.marker, '◦');
		assert.equal(blocks[4]?.marker, '1.');
		assert.equal(blocks[5]?.marker, '☑');
		assert.deepEqual(blocks[7]?.lines, ['code']);
		assert.deepEqual(blocks[10]?.runs.map((run) => run.text), ['1', '  │  ', '2']);
	});

	test('callouts show their title', () => {
		const [title, body] = parseMarkdown('> [!warning] Cuidado\n> texto');
		assert.deepEqual(title?.runs, [{ text: 'Cuidado', style: { bold: true } }]);
		assert.equal(body?.quote, 1);
	});

	test('setext headings and comments', () => {
		const blocks = parseMarkdown('Título\n===\n%%oculto%%texto');
		assert.equal(blocks[0]?.kind, 'heading');
		assert.deepEqual(blocks[1]?.runs, [{ text: 'texto', style: {} }]);
	});

	test('frontmatter and subpaths', () => {
		assert.equal(stripFrontmatter('---\na: 1\n---\ncorpo'), 'corpo');
		assert.equal(stripFrontmatter('sem frontmatter'), 'sem frontmatter');
		const note = '# A\num\n## B\ndois\n### C\ntrês\n## D\nquatro ^bloco';
		assert.equal(extractSubpath(note, '#B'), '## B\ndois\n### C\ntrês');
		assert.equal(extractSubpath(note, '#A#B'), '## B\ndois\n### C\ntrês');
		assert.equal(extractSubpath(note, '#^bloco'), 'quatro');
		assert.equal(extractSubpath(note, '#Z'), note);
	});
});

describe('layout', () => {
	test('wraps words to the width', () => {
		const layout = layoutMarkdown('uma frase com várias palavras para quebrar', { width: 100, measure: approximateMeasurer });
		assert.ok(layout.lines.length > 2);
		for (const line of layout.lines) {
			const last = line.runs[line.runs.length - 1];
			assert.ok(last && last.x + last.width <= 100 + 1e-6, 'every line fits');
		}
	});

	test('no break between pieces of one word with different styles', () => {
		const measure = (text: string): number => text.length * 10;
		const layout = layoutMarkdown('aaaa **bbbb**.', { width: 95, measure });
		const lines = layout.lines.map((line) => line.runs.map((run) => run.text).join(''));
		assert.deepEqual(lines, ['aaaa', 'bbbb.']);
	});

	test('long words are split', () => {
		const layout = layoutMarkdown('a'.repeat(80), { width: 100, measure: approximateMeasurer });
		assert.ok(layout.lines.length >= 4);
	});

	test('centered lines', () => {
		const layout = layoutMarkdown('meio', { width: 200, measure: approximateMeasurer, align: 'center' });
		const run = layout.lines[0]?.runs[0];
		assert.ok(run && Math.abs(run.x + run.width / 2 - 100) < 1e-6);
	});

	test('stops below the maximum height', () => {
		const text = Array.from({ length: 200 }, (_, i) => `linha ${i}`).join('\n');
		const layout = layoutMarkdown(text, { width: 200, measure: approximateMeasurer, maxHeight: 100 });
		assert.ok(layout.lines.length < 10);
	});
});

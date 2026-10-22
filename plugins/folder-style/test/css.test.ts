import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { folderCss } from '../src/css/folder-css';
import { defaultSettings } from '../src/settings';
import type { FolderStyle, FolderStyleSettings } from '../src/types';

const BOOK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 3h6"/></svg>';
const icons: Record<string, string> = { 'book-open': BOOK_SVG };
const iconSvg = (id: string): string | null => icons[id] ?? null;

function settings(folders: Record<string, FolderStyle>, overrides: Partial<FolderStyleSettings> = {}): FolderStyleSettings {
	return { ...defaultSettings(), folders, ...overrides };
}

function cssFor(folders: Record<string, FolderStyle>, overrides?: Partial<FolderStyleSettings>): string {
	return folderCss(settings(folders, overrides), iconSvg).css;
}

describe('text symbol', () => {
	test('goes before the folder name of that path', () => {
		const css = cssFor({ Reading: { symbol: { kind: 'text', value: '📚' } } });
		assert.match(css, /\[data-path="Reading"\][^{]*> \.nav-folder-title-content:not\(\[contenteditable="true"\]\)::before \{[^}]*content: "📚";/);
	});

	test('quotes and backslashes are escaped in the path and in the symbol; accents stay as they are', () => {
		const css = cssFor({ 'Área/O "Livro" \\ 2': { symbol: { kind: 'text', value: '"\\' } } });
		assert.ok(css.includes('[data-path="Área/O \\"Livro\\" \\\\ 2"]'), css);
		assert.ok(css.includes('content: "\\"\\\\";'), css);
	});

	test('line breaks cannot end the string', () => {
		const css = cssFor({ 'A\nB': { symbol: { kind: 'text', value: 'x\ny' } } });
		assert.ok(css.includes('[data-path="A\\a B"]'), css);
		assert.ok(css.includes('content: "x\\a y";'), css);
	});

	test('an empty text is no symbol', () => {
		assert.equal(cssFor({ Reading: { symbol: { kind: 'text', value: '  ' } } }), '');
	});
});

/** The declaration block of the first rule whose selector list matches `selector`. */
function block(css: string, selector: RegExp): string {
	for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		if (selector.test(match[1] ?? '')) return match[2] ?? '';
	}
	assert.fail(`no rule for ${selector}\n${css}`);
}

describe('color', () => {
	const row = /\[data-path="Work"\]:not\(\.is-being-dragged, \.is-being-dragged-over\)\s*$/;
	const hover = /\[data-path="Work"\]:not\(\.is-being-dragged, \.is-being-dragged-over\):hover\s*$/;
	const active = /\[data-path="Work"\]:not\(\.is-being-dragged, \.is-being-dragged-over\)\.is-active/;
	const selected = /\[data-path="Work"\]:not\(\.is-being-dragged, \.is-being-dragged-over\)\.is-selected/;
	const children = /\[data-path="Work"\] \+ \.nav-folder-children\s*$/;

	test('a preset tints the row with the theme color at the base opacity', () => {
		const css = cssFor({ Work: { color: { kind: 'preset', value: 'blue' } } });
		assert.match(block(css, row), /background-color: rgba\(var\(--color-blue-rgb\), 0\.12\);/);
	});

	test('hover is 6 points stronger, active and selected 12, the subtree half', () => {
		const css = cssFor({ Work: { color: { kind: 'preset', value: 'red' } } });
		assert.match(block(css, hover), /rgba\(var\(--color-red-rgb\), 0\.18\)/);
		assert.match(block(css, active), /rgba\(var\(--color-red-rgb\), 0\.24\)/);
		assert.match(block(css, selected), /rgba\(var\(--color-red-rgb\), 0\.24\)/);
		assert.match(block(css, children), /rgba\(var\(--color-red-rgb\), 0\.06\)/);
	});

	test('hover only where there is a pointer that hovers', () => {
		const css = cssFor({ Work: { color: { kind: 'preset', value: 'red' } } });
		assert.match(css, /@media \(hover: hover\) \{[^{}]*:hover\s*\{/);
	});

	test('the opacity setting drives every level, capped at 1', () => {
		const css = cssFor({ Work: { color: { kind: 'preset', value: 'green' } } }, { opacity: 0.3 });
		assert.match(block(css, row), /0\.3\)/);
		assert.match(block(css, hover), /0\.36\)/);
		assert.match(block(css, active), /0\.42\)/);
		assert.match(block(css, children), /0\.15\)/);
		const full = cssFor({ Work: { color: { kind: 'preset', value: 'green' } } }, { opacity: 0.95 });
		assert.match(block(full, active), /, 1\)/);
	});

	test('hex is converted to channels, short form too', () => {
		assert.match(cssFor({ Work: { color: { kind: 'hex', value: '#d97706' } } }), /rgba\(217, 119, 6, 0\.12\)/);
		assert.match(cssFor({ Work: { color: { kind: 'hex', value: '#ABC' } } }), /rgba\(170, 187, 204, 0\.12\)/);
	});

	test('an invalid hex is no color', () => {
		assert.equal(cssFor({ Work: { color: { kind: 'hex', value: '#12345' } } }), '');
		assert.equal(cssFor({ Work: { color: { kind: 'hex', value: 'blue' } } }), '');
	});

	test('the subtree is left alone when tinting children is off', () => {
		const css = cssFor({ Work: { color: { kind: 'preset', value: 'red' } } }, { tintChildren: false });
		assert.doesNotMatch(css, /nav-folder-children/);
		assert.match(block(css, row), /0\.12\)/);
	});

	test('the text symbol takes the folder color, without changing the name color', () => {
		const css = cssFor({ Work: { symbol: { kind: 'text', value: '§' }, color: { kind: 'preset', value: 'red' } } });
		assert.match(block(css, /::before/), /color: rgb\(var\(--color-red-rgb\)\);/);
		assert.doesNotMatch(block(css, row), /(^|[^-])color:/);
	});
});

describe('lucide symbol', () => {
	const before = /\[data-path="Library"\] > \.nav-folder-title-content:not\(\[contenteditable="true"\]\)::before/;

	test('is the built-in SVG used as a mask, painted in the text color', () => {
		const css = cssFor({ Library: { symbol: { kind: 'lucide', value: 'book-open' } } });
		const rule = block(css, before);
		assert.match(rule, /content: "";/);
		assert.match(rule, /background-color: currentColor;/);
		const urls = [...rule.matchAll(/(?:-webkit-)?mask-image: url\("data:image\/svg\+xml,([^"]+)"\);/g)];
		assert.equal(urls.length, 2, rule);
		for (const url of urls) assert.equal(decodeURIComponent(url[1] ?? ''), BOOK_SVG);
	});

	test('takes the folder color when there is one', () => {
		const css = cssFor({ Library: { symbol: { kind: 'lucide', value: 'book-open' }, color: { kind: 'hex', value: '#00ff00' } } });
		assert.match(block(css, before), /background-color: rgb\(0, 255, 0\);/);
	});

	test('an icon Obsidian no longer has is skipped and reported, the rest still applies', () => {
		const result = folderCss(
			settings({
				Library: { symbol: { kind: 'lucide', value: 'gone-icon' }, color: { kind: 'preset', value: 'blue' } },
				Reading: { symbol: { kind: 'lucide', value: 'book-open' } },
			}),
			iconSvg,
		);
		assert.deepEqual(result.missingIcons, ['Library']);
		assert.doesNotMatch(result.css, before);
		assert.match(result.css, /\[data-path="Library"\]:not\(\.is-being-dragged, \.is-being-dragged-over\) \{/);
		assert.match(result.css, /\[data-path="Reading"\] > \.nav-folder-title-content:not\(\[contenteditable="true"\]\)::before/);
	});

	test('nothing is reported when every icon exists', () => {
		const result = folderCss(settings({ Reading: { symbol: { kind: 'lucide', value: 'book-open' } } }), iconSvg);
		assert.deepEqual(result.missingIcons, []);
	});
});

describe('symbol size', () => {
	test('scales text and icons from the folder name size', () => {
		const css = cssFor(
			{ Reading: { symbol: { kind: 'text', value: '📚' } }, Library: { symbol: { kind: 'lucide', value: 'book-open' } } },
			{ symbolSize: 1.5 },
		);
		assert.match(block(css, /"Reading"\] > .*::before/), /font-size: 1\.5em;/);
		const icon = block(css, /"Library"\] > .*::before/);
		assert.match(icon, /width: 1\.5em;/);
		assert.match(icon, /height: 1\.5em;/);
	});
});

describe('folders', () => {
	test('the vault root is never styled', () => {
		const css = cssFor({ '/': { symbol: { kind: 'text', value: '★' } }, '': { symbol: { kind: 'text', value: '★' } } });
		assert.equal(css, '');
	});

	test('folders with the same name at different levels get separate rules', () => {
		const css = cssFor({ 'A/Notes': { symbol: { kind: 'text', value: '1' } }, 'B/Notes': { symbol: { kind: 'text', value: '2' } } });
		assert.match(css, /\[data-path="A\/Notes"\][^{]*\{[^}]*content: "1"/);
		assert.match(css, /\[data-path="B\/Notes"\][^{]*\{[^}]*content: "2"/);
	});
});

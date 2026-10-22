import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { draftFromStyle, styleFromDraft } from '../src/ui/draft';
import type { Draft } from '../src/ui/draft';

const empty: Draft = { symbolKind: 'none', text: '', icon: '', color: { kind: 'none' }, hex: '' };

describe('opening the modal', () => {
	test('a folder without style starts empty', () => {
		assert.deepEqual(draftFromStyle(undefined), empty);
	});

	test('a saved style fills the draft', () => {
		assert.deepEqual(draftFromStyle({ symbol: { kind: 'text', value: '💼' }, color: { kind: 'hex', value: '#d97706' } }), {
			...empty,
			symbolKind: 'text',
			text: '💼',
			color: { kind: 'hex' },
			hex: '#d97706',
		});
		assert.deepEqual(draftFromStyle({ symbol: { kind: 'lucide', value: 'book-open' }, color: { kind: 'preset', value: 'blue' } }), {
			...empty,
			symbolKind: 'lucide',
			icon: 'book-open',
			color: { kind: 'preset', value: 'blue' },
		});
	});
});

describe('saving the modal', () => {
	test('the chosen symbol and color become the style', () => {
		assert.deepEqual(styleFromDraft({ ...empty, symbolKind: 'lucide', icon: 'book-open', color: { kind: 'preset', value: 'blue' } }), {
			ok: true,
			style: { symbol: { kind: 'lucide', value: 'book-open' }, color: { kind: 'preset', value: 'blue' } },
		});
	});

	test('only the selected symbol kind counts; what was typed in the other is ignored', () => {
		const draft: Draft = { ...empty, symbolKind: 'text', text: ' ★ ', icon: 'book-open' };
		assert.deepEqual(styleFromDraft(draft), { ok: true, style: { symbol: { kind: 'text', value: '★' } } });
		assert.deepEqual(styleFromDraft({ ...draft, symbolKind: 'none' }), { ok: true, style: null });
	});

	test('an empty text or no icon chosen is no symbol', () => {
		assert.deepEqual(styleFromDraft({ ...empty, symbolKind: 'text', text: '   ' }), { ok: true, style: null });
		assert.deepEqual(styleFromDraft({ ...empty, symbolKind: 'lucide', color: { kind: 'preset', value: 'red' } }), {
			ok: true,
			style: { color: { kind: 'preset', value: 'red' } },
		});
	});

	test('hex is normalized: # optional, short form expanded, lowercase', () => {
		for (const hex of ['#D97706', 'd97706', ' #d97706 ']) {
			assert.deepEqual(styleFromDraft({ ...empty, color: { kind: 'hex' }, hex }), { ok: true, style: { color: { kind: 'hex', value: '#d97706' } } });
		}
		assert.deepEqual(styleFromDraft({ ...empty, color: { kind: 'hex' }, hex: '#ABC' }), { ok: true, style: { color: { kind: 'hex', value: '#aabbcc' } } });
	});

	test('an invalid hex cannot be saved', () => {
		assert.deepEqual(styleFromDraft({ ...empty, color: { kind: 'hex' }, hex: '#12345' }), { ok: false, error: 'hex' });
		assert.deepEqual(styleFromDraft({ ...empty, color: { kind: 'hex' }, hex: '' }), { ok: false, error: 'hex' });
	});

	test('nothing chosen means no customization', () => {
		assert.deepEqual(styleFromDraft(empty), { ok: true, style: null });
	});
});

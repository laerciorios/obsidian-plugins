import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';
import {
	aliasesChanged,
	aliasesOf,
	localizedAlias,
	mergeAliases,
	nextAliases,
	noteAliases,
	placeAliases,
	sameAlias,
} from '../src/catalog/aliases';
import { catalogFrontmatter } from '../src/catalog/frontmatter';
import { findLocalizedTitle, hasLocalizedTitles } from '../src/providers/localized-title';
import type { CatalogDraft, MediaKind, Provider, SearchResult } from '../src/types';

// settleWithin uses window.setTimeout, as in the app.
(globalThis as unknown as { window?: unknown }).window ??= globalThis;

describe('second alias: when it goes in', () => {
	test('only the title when there is no localized title', () => {
		assert.deepEqual(noteAliases('movie', 'Fern Road', null, null), ['Fern Road']);
		assert.deepEqual(noteAliases('movie', 'Fern Road', null, '   '), ['Fern Road']);
	});

	test('the localized title second when it differs', () => {
		assert.deepEqual(noteAliases('movie', 'Fern Road', null, 'Estrada das Samambaias'), ['Fern Road', 'Estrada das Samambaias']);
		assert.deepEqual(noteAliases('game', ' Moss Quest ', null, ' Busca do Musgo '), ['Moss Quest', 'Busca do Musgo']);
	});

	test('not when it matches the title once case and whitespace are ignored', () => {
		assert.deepEqual(noteAliases('movie', 'Fern Road', null, 'fern road'), ['Fern Road']);
		assert.deepEqual(noteAliases('movie', 'Fern Road', null, 'FERN  ROAD'), ['Fern Road']);
		assert.deepEqual(noteAliases('movie', 'Fern Road', null, 'FernRoad'), ['Fern Road']);
		assert.equal(sameAlias('Fern Road', 'Fern\tRoad '), true);
	});

	test('accents and punctuation still count', () => {
		assert.deepEqual(noteAliases('movie', 'Fern Road', null, 'Férn Road'), ['Fern Road', 'Férn Road']);
		assert.deepEqual(noteAliases('movie', 'Fern Road', null, 'Fern-Road'), ['Fern Road', 'Fern-Road']);
	});

	test('series: both aliases carry the season of the note', () => {
		assert.deepEqual(noteAliases('series', 'Horta Selvagem', 2, 'Horta Brava'), ['Horta Selvagem (S02)', 'Horta Brava (S02)']);
		assert.deepEqual(noteAliases('series', 'Horta Selvagem', 1, null), ['Horta Selvagem (S01)']);
		// A season already in the localized name is not repeated.
		assert.deepEqual(noteAliases('series', 'Horta Selvagem', 2, 'Horta Brava (S02)'), ['Horta Selvagem (S02)', 'Horta Brava (S02)']);
	});

	test('series: the same name as the title gives no second alias', () => {
		assert.deepEqual(noteAliases('series', 'Horta Selvagem', 3, 'horta selvagem'), ['Horta Selvagem (S03)']);
		assert.equal(localizedAlias('series', 'Horta Selvagem', 3, 'Horta Selvagem (S03)'), null);
	});

	test('books and albums never look one up', async () => {
		let calls = 0;
		const provider = fakeProvider(['book', 'album'], () => {
			calls++;
			return Promise.resolve('Outro Título');
		});
		assert.equal(hasLocalizedTitles('book'), false);
		assert.equal(hasLocalizedTitles('album'), false);
		assert.equal(await findLocalizedTitle(provider, result('book', 'b1'), 'BR'), null);
		assert.equal(await findLocalizedTitle(provider, result('album', 'a1'), 'BR'), null);
		assert.equal(calls, 0);
	});

	test('no country: nothing is looked up', async () => {
		let calls = 0;
		const provider = fakeProvider(['movie'], () => {
			calls++;
			return Promise.resolve('Estrada das Samambaias');
		});
		assert.equal(await findLocalizedTitle(provider, result('movie', 'tt1'), ''), null);
		assert.equal(calls, 0);
	});

	test('the lookup answers the title of the country', async () => {
		const seen: string[] = [];
		const provider = fakeProvider(['movie'], (_result, country) => {
			seen.push(country);
			return Promise.resolve('Estrada das Samambaias');
		});
		assert.equal(await findLocalizedTitle(provider, result('movie', 'tt2'), 'PT'), 'Estrada das Samambaias');
		assert.deepEqual(seen, ['PT']);
	});

	test('a failed lookup gives null, never an error', async () => {
		const provider = fakeProvider(['movie'], () => Promise.reject(new Error('offline')));
		const error = mock.method(console, 'error', () => undefined);
		try {
			assert.equal(await findLocalizedTitle(provider, result('movie', 'tt3'), 'BR'), null);
		} finally {
			error.mock.restore();
		}
	});

	test('a lookup that does not answer in time gives null', async () => {
		const provider = fakeProvider(['series'], () => new Promise<string | null>(() => undefined));
		assert.equal(await findLocalizedTitle(provider, result('series', '42'), 'BR', 10), null);
	});
});

describe('frontmatter of a new note', () => {
	test('aliases right after title, quoted', () => {
		const text = catalogFrontmatter(draft({ localizedTitle: 'Estrada das Samambaias' }), { cover: '', reference: '' });
		const lines = text.split('\n');
		assert.equal(lines[1], 'kind: movie');
		assert.equal(lines[2], 'title: "Fern Road"');
		assert.equal(lines[3], 'aliases: ["Fern Road", "Estrada das Samambaias"]');
		assert.equal(lines[4], 'author: ""');
		assert.equal(lines[5], 'year: 2031');
	});

	test('one alias without a localized title; quotes escaped', () => {
		const text = catalogFrontmatter(draft({ title: 'Fern "Road"', localizedTitle: null }), { cover: '', reference: '' });
		assert.match(text, /^aliases: \["Fern \\"Road\\""\]$/m);
	});

	test('series write the season in both', () => {
		const series = draft({ kind: 'series', title: 'Horta Selvagem', season: 2, localizedTitle: 'Horta Brava' });
		const text = catalogFrontmatter(series, { cover: '', reference: '' });
		assert.match(text, /^title: "Horta Selvagem \(S02\)"\naliases: \["Horta Selvagem \(S02\)", "Horta Brava \(S02\)"\]\nseason: 2$/m);
	});

	test('every kind writes aliases after title', () => {
		for (const kind of ['movie', 'series', 'game', 'book', 'album'] as const) {
			const lines = catalogFrontmatter(draft({ kind }), { cover: '', reference: '' }).split('\n');
			assert.equal(lines[3]?.startsWith('aliases: ['), true, kind);
		}
	});
});

describe('"Update aliases"', () => {
	test('title first, then the localized title, then every alias the note had', () => {
		const frontmatter = { kind: 'movie', title: 'Fern Road', aliases: ['Road of Ferns', 'Fern Road'] };
		assert.deepEqual(nextAliases(frontmatter, 'movie', 'Estrada das Samambaias'), ['Fern Road', 'Estrada das Samambaias', 'Road of Ferns']);
	});

	test('aliases added by hand and of an earlier country stay', () => {
		const frontmatter = { title: 'Fern Road', aliases: ['Fern Road', 'Estrada das Samambaias', 'FR'] };
		assert.deepEqual(nextAliases(frontmatter, 'movie', 'Camino de Helechos'), [
			'Fern Road',
			'Camino de Helechos',
			'Estrada das Samambaias',
			'FR',
		]);
		assert.deepEqual(nextAliases(frontmatter, 'movie', null), ['Fern Road', 'Estrada das Samambaias', 'FR']);
	});

	test('repeats go, the first one stays', () => {
		assert.deepEqual(mergeAliases(['Fern Road', 'Estrada'], ['fern road', 'ESTRADA', 'Outro', 'outro ']), ['Fern Road', 'Estrada', 'Outro']);
	});

	test('a note without aliases, or with a single text', () => {
		assert.deepEqual(nextAliases({ title: 'Fern Road' }, 'movie', null), ['Fern Road']);
		assert.deepEqual(nextAliases({ title: 'Fern Road', aliases: 'Samambaias' }, 'movie', null), ['Fern Road', 'Samambaias']);
		assert.deepEqual(aliasesOf([1984, null, ' x ', '', {}]), ['1984', 'x']);
	});

	test('series use the season of the note', () => {
		const frontmatter = { title: 'Horta Selvagem (S02)', season: 2, aliases: ['Horta Selvagem (S02)'] };
		assert.deepEqual(nextAliases(frontmatter, 'series', 'Horta Brava'), ['Horta Selvagem (S02)', 'Horta Brava (S02)']);
	});

	test('changed only when the list differs', () => {
		assert.equal(aliasesChanged(['Fern Road'], ['Fern Road']), false);
		assert.equal(aliasesChanged('Fern Road', ['Fern Road']), true);
		assert.equal(aliasesChanged(undefined, ['Fern Road']), true);
		assert.equal(aliasesChanged(['Estrada', 'Fern Road'], ['Fern Road', 'Estrada']), true);
	});

	test('a new key goes right after title; other keys keep their order', () => {
		const frontmatter: Record<string, unknown> = { kind: 'movie', title: 'Fern Road', year: 2031, tags: ['entertainment'] };
		placeAliases(frontmatter, ['Fern Road']);
		assert.deepEqual(Object.keys(frontmatter), ['kind', 'title', 'aliases', 'year', 'tags']);
		assert.deepEqual(frontmatter.aliases, ['Fern Road']);
	});

	test('an existing key is replaced where it is', () => {
		const frontmatter: Record<string, unknown> = { kind: 'movie', title: 'Fern Road', year: 2031, aliases: ['x'] };
		placeAliases(frontmatter, ['Fern Road', 'x']);
		assert.deepEqual(Object.keys(frontmatter), ['kind', 'title', 'year', 'aliases']);
		assert.deepEqual(frontmatter.aliases, ['Fern Road', 'x']);
	});

	test('without a title the key goes first', () => {
		const frontmatter: Record<string, unknown> = { kind: 'movie', year: 2031 };
		placeAliases(frontmatter, ['x']);
		assert.deepEqual(Object.keys(frontmatter), ['aliases', 'kind', 'year']);
	});
});

function fakeProvider(kinds: MediaKind[], localizedTitle: NonNullable<Provider['localizedTitle']>): Provider {
	return { id: 'imdb', name: 'Fake', kinds, search: () => Promise.resolve([]), localizedTitle };
}

function result(kind: MediaKind, externalId: string): SearchResult {
	return { provider: 'imdb', externalId, kind, title: 'Fern Road' };
}

function draft(overrides: Partial<CatalogDraft>): CatalogDraft {
	return {
		destination: 'catalog',
		kind: 'movie',
		title: 'Fern Road',
		year: 2031,
		status: 'in-progress',
		rating: null,
		started: '2031-05-01',
		finished: null,
		platform: '',
		season: null,
		episodes: null,
		hours: null,
		author: '',
		pages: null,
		estimatedHours: null,
		priority: null,
		recommendedBy: '',
		referenceArea: null,
		cover: { url: null, download: false },
		source: { provider: 'imdb', name: 'IMDb', url: null },
		tracks: null,
		localizedTitle: null,
		...overrides,
	};
}

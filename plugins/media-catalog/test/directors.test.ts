import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { TFile, TFolder } from 'obsidian';
import type { App } from 'obsidian';
import { findDuplicate } from '../src/catalog/duplicates';
import { catalogFrontmatter } from '../src/catalog/frontmatter';
import { nameCandidates } from '../src/catalog/note-writer';
import { hasAuthor, initialValues } from '../src/modal/confirm-values';
import { withDirectors } from '../src/modal/resolve-step';
import type { CatalogDraft, Provider, SearchResult } from '../src/types';

/** Fictional film, directors and album. */
const FILM: SearchResult = { provider: 'imdb', externalId: 'tt7654321', kind: 'movie', title: 'Fern Road', year: 1984 };
const DIRECTORS = ['Ilsa Marrow', 'Teodoro Brann'];
const IMDB = { id: 'imdb', name: 'IMDb', kinds: ['movie'], search: () => Promise.resolve([]) } satisfies Provider;

function draft(overrides: Partial<CatalogDraft>): CatalogDraft {
	return {
		destination: 'catalog',
		kind: 'movie',
		title: 'Fern Road',
		year: 1984,
		status: 'backlog',
		rating: null,
		started: null,
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

function take<T>(items: Iterable<T>, count: number): T[] {
	const taken: T[] = [];
	for (const item of items) {
		if (taken.length === count) break;
		taken.push(item);
	}
	return taken;
}

function note(path: string, frontmatter: Record<string, unknown>): { file: TFile; frontmatter: Record<string, unknown> } {
	const file = Object.assign(new TFile(), { path, extension: 'md', basename: path.replace(/^.*\/|\.md$/g, '') });
	return { file, frontmatter };
}

/** Just what findDuplicate reads: one catalog folder and the frontmatter of its notes. */
function fakeApp(folder: string, notes: { file: TFile; frontmatter: Record<string, unknown> }[]): App {
	const root = Object.assign(new TFolder(), { path: folder, children: notes.map((entry) => entry.file) });
	const app = {
		vault: {
			getFolderByPath: (path: string) => (path === folder ? root : null),
			getFileByPath: (path: string) => notes.find((entry) => entry.file.path === path)?.file ?? null,
		},
		metadataCache: {
			getFileCache: (file: TFile) => ({ frontmatter: notes.find((entry) => entry.file === file)?.frontmatter }),
		},
	};
	return app as unknown as App;
}

describe('Movies: directors in author', () => {
	test('movie notes have author, quoted, right after aliases', () => {
		assert.equal(hasAuthor('movie'), true);
		const text = catalogFrontmatter(draft({ author: ' Ilsa Marrow, Teodoro Brann ' }), { cover: '', reference: '' });
		assert.match(text, /^aliases: \["Fern Road"\]\nauthor: "Ilsa Marrow, Teodoro Brann"\nyear: 1984$/m);
	});

	test('the form starts with the directors joined by ", "', () => {
		const input = { result: withDirectors(FILM, DIRECTORS), provider: IMDB, season: null };
		assert.equal(initialValues(input, 'backlog').author, 'Ilsa Marrow, Teodoro Brann');
	});

	test('no directors found: the field starts empty', () => {
		for (const directors of [undefined, []]) {
			const result = withDirectors(FILM, directors);
			assert.equal(result, FILM);
			assert.equal(initialValues({ result, provider: IMDB, season: null }, 'backlog').author, '');
		}
	});

	test('the directors never go into the note name', () => {
		const names = take(nameCandidates(draft({ author: 'Ilsa Marrow, Teodoro Brann' })), 3);
		assert.deepEqual(names, ['fern-road', 'fern-road-1984', 'fern-road-1984-2']);
		const album = take(nameCandidates(draft({ kind: 'album', title: 'Salt Choir', year: 2019, author: 'The Lanterns' })), 2);
		assert.deepEqual(album, ['salt-choir', 'salt-choir-the-lanterns']);
	});

	test('another director does not make a new film: still a duplicate', () => {
		const folder = 'Catalog';
		const existing = note('Catalog/fern-road.md', { kind: 'movie', title: 'Fern Road', year: 1984, author: 'Otto Varga' });
		const app = fakeApp(folder, [existing]);
		const query = { kind: 'movie', title: 'Fern Road', season: null, year: 1984, author: 'Ilsa Marrow' } as const;
		assert.equal(findDuplicate(app, folder, query), existing.file);
	});

	test('albums still tell two artists apart', () => {
		const folder = 'Catalog';
		const existing = note('Catalog/salt-choir.md', { kind: 'album', title: 'Salt Choir', year: 2019, author: 'The Lanterns' });
		const app = fakeApp(folder, [existing]);
		const query = { kind: 'album', title: 'Salt Choir', season: null, year: 2019, author: 'Rosa Tamblin' } as const;
		assert.equal(findDuplicate(app, folder, query), null);
	});
});

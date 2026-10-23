import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { findInCatalogOrBacklog } from '../src/catalog/duplicates';
import { destinationFolder, destinationOf, existingSeriesFolder, misplacedTarget, seriesFolderName } from '../src/catalog/kind-folders';
import { nameOwners, noteName } from '../src/catalog/note-writer';
import type { NameOwner } from '../src/catalog/note-writer';
import type { CatalogDraft } from '../src/types';
import { fakeVault } from './fake-vault';

/** Fictional titles, artists and people only. */
const CATALOG = 'Media/DB';
const BACKLOG = 'Media/Backlog/DB';
const SETTINGS = { folder: CATALOG, backlogFolder: BACKLOG };

function draft(overrides: Partial<CatalogDraft>): CatalogDraft {
	return {
		destination: 'catalog',
		kind: 'movie',
		title: 'Fern Road',
		year: 1984,
		status: 'in-progress',
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

/** noteName with these names taken (anything else is free). */
function nameWith(item: CatalogDraft, taken: Record<string, NameOwner>): string {
	return noteName(item, (name) => taken[name] ?? 'free');
}

describe('Kind folders: series folder names', () => {
	test('characters Obsidian rejects in names are removed', () => {
		assert.equal(seriesFolderName('Lantern Bay: Origins'), 'Lantern Bay Origins');
		assert.equal(seriesFolderName('What Now…?'), 'What Now…');
		assert.equal(seriesFolderName('Moss <Engine> | "Live"'), 'Moss Engine Live');
	});

	test('a run of * becomes "-"', () => {
		assert.equal(seriesFolderName('Fern**Road'), 'Fern-Road');
		assert.equal(seriesFolderName('M*O*S*S'), 'M-O-S-S');
	});

	test('other characters stay; nothing left falls back to the slug', () => {
		assert.equal(seriesFolderName('Love, Rain & Robots'), 'Love, Rain & Robots');
		assert.equal(seriesFolderName('Dr. Fern'), 'Dr. Fern');
		assert.equal(seriesFolderName('???'), 'untitled');
	});
});

describe('Kind folders: where a new note goes', () => {
	test('one folder per kind, in the catalog and in the backlog', () => {
		const { app } = fakeVault([]);
		assert.equal(destinationFolder(app, SETTINGS, 'catalog', 'movie', 'Fern Road'), `${CATALOG}/Movies`);
		assert.equal(destinationFolder(app, SETTINGS, 'catalog', 'game', 'Moss Engine'), `${CATALOG}/Games`);
		assert.equal(destinationFolder(app, SETTINGS, 'backlog', 'book', 'Salt Atlas'), `${BACKLOG}/Books`);
		assert.equal(destinationFolder(app, SETTINGS, 'backlog', 'album', 'Salt Choir'), `${BACKLOG}/Albums`);
	});

	test('a series gets its own folder, named after the series without the season', () => {
		const { app } = fakeVault([]);
		assert.equal(destinationFolder(app, SETTINGS, 'catalog', 'series', 'Lantern Bay: Origins (S02)'), `${CATALOG}/Series/Lantern Bay Origins`);
		assert.equal(destinationFolder(app, SETTINGS, 'backlog', 'series', 'Lantern Bay'), `${BACKLOG}/Series/Lantern Bay`);
	});

	test('the folder of a season already filed is used, whatever its name', () => {
		const { app } = fakeVault([
			{ path: `${CATALOG}/Series/Lantern Bay (BR)/lantern-bay-s01.md`, frontmatter: { kind: 'series', title: 'Lantern Bay (S01)', season: 1 } },
		]);
		assert.equal(destinationFolder(app, SETTINGS, 'catalog', 'series', 'Lantern Bay'), `${CATALOG}/Series/Lantern Bay (BR)`);
		// A season in the backlog lends its folder name to the catalog.
		assert.equal(destinationFolder(app, SETTINGS, 'backlog', 'series', 'Lantern Bay (S03)'), `${BACKLOG}/Series/Lantern Bay (BR)`);
	});

	test('the destination wins over the other folder; other series and kinds do not count', () => {
		const { app } = fakeVault([
			{ path: `${BACKLOG}/Series/Bay Lantern/lantern-bay-s03.md`, frontmatter: { kind: 'series', title: 'Lantern Bay (S03)', season: 3 } },
			{ path: `${CATALOG}/Series/Lantern Bay/lantern-bay-s01.md`, frontmatter: { kind: 'series', title: 'Lantern Bay (S01)', season: 1 } },
			{ path: `${CATALOG}/Series/Fern/fern-road-s01.md`, frontmatter: { kind: 'movie', title: 'Moss Engine' } },
		]);
		assert.equal(existingSeriesFolder(app, [CATALOG, BACKLOG], 'Lantern Bay'), 'Lantern Bay');
		assert.equal(existingSeriesFolder(app, [BACKLOG, CATALOG], 'Lantern Bay'), 'Bay Lantern');
		assert.equal(existingSeriesFolder(app, [CATALOG, BACKLOG], 'Moss Engine'), null);
	});
});

describe('Kind folders: note names, unique in the vault', () => {
	test('a free slug is the name', () => {
		assert.equal(nameWith(draft({}), {}), 'fern-road');
		assert.equal(nameWith(draft({ kind: 'series', title: 'Lantern Bay', season: 2 }), {}), 'lantern-bay-s02');
	});

	test('taken by the same kind: the year, then a counter', () => {
		assert.equal(nameWith(draft({}), { 'fern-road': 'same-kind' }), 'fern-road-1984');
		assert.equal(nameWith(draft({}), { 'fern-road': 'same-kind', 'fern-road-1984': 'same-kind' }), 'fern-road-1984-2');
		assert.equal(nameWith(draft({ year: null }), { 'fern-road': 'same-kind' }), 'fern-road-2');
		const series = draft({ kind: 'series', title: 'Lantern Bay', season: 1, year: 2031 });
		assert.equal(nameWith(series, { 'lantern-bay-s01': 'same-kind' }), 'lantern-bay-2031-s01');
	});

	test('taken by another kind: the kind', () => {
		assert.equal(nameWith(draft({}), { 'fern-road': 'other' }), 'fern-road-movie');
		assert.equal(nameWith(draft({ kind: 'game', title: 'Fern Road' }), { 'fern-road': 'other' }), 'fern-road-game');
		assert.equal(nameWith(draft({ kind: 'book', title: 'Fern Road' }), { 'fern-road': 'other' }), 'fern-road-book');
		const series = draft({ kind: 'series', title: 'Fern Road', season: 1 });
		assert.equal(nameWith(series, { 'fern-road-s01': 'other' }), 'fern-road-series-s01');
	});

	test('the kind is added once; then the same-kind rules go on', () => {
		const taken: Record<string, NameOwner> = { 'fern-road': 'other', 'fern-road-movie': 'same-kind' };
		assert.equal(nameWith(draft({}), taken), 'fern-road-movie-1984');
		assert.equal(nameWith(draft({}), { 'fern-road': 'other', 'fern-road-movie': 'other' }), 'fern-road-movie-1984');
		// Taken by the same kind first: the year, and the kind only if the next name belongs to another kind.
		assert.equal(nameWith(draft({}), { 'fern-road': 'same-kind', 'fern-road-1984': 'other' }), 'fern-road-1984-movie');
	});

	test('albums keep the artist before the year', () => {
		const album = draft({ kind: 'album', title: 'Salt Choir', year: 2019, author: 'The Lanterns' });
		assert.equal(nameWith(album, { 'salt-choir': 'same-kind' }), 'salt-choir-the-lanterns');
		assert.equal(nameWith(album, { 'salt-choir': 'same-kind', 'salt-choir-the-lanterns': 'same-kind' }), 'salt-choir-the-lanterns-2019');
		assert.equal(nameWith(album, { 'salt-choir': 'other' }), 'salt-choir-album');
		const selfTitled = draft({ kind: 'album', title: 'The Lanterns', year: 2001, author: 'The Lanterns' });
		assert.equal(nameWith(selfTitled, { 'the-lanterns': 'same-kind' }), 'the-lanterns-2001');
	});

	test('names are looked up in the whole vault, case ignored', () => {
		const { app } = fakeVault([
			{ path: `${CATALOG}/Games/fern-road.md`, frontmatter: { kind: 'game', title: 'Fern Road' } },
			{ path: 'Notes/Deep/Moss-Engine.md', frontmatter: null },
			{ path: `${BACKLOG}/Movies/salt-atlas.md`, frontmatter: { kind: 'movie', title: 'Salt Atlas' } },
		]);
		const owners = nameOwners(app, 'movie');
		assert.equal(owners('fern-road'), 'other');
		assert.equal(owners('moss-engine'), 'other');
		assert.equal(owners('salt-atlas'), 'same-kind');
		assert.equal(owners('lantern-bay'), 'free');
		assert.equal(noteName(draft({}), owners), 'fern-road-movie');
		assert.equal(noteName(draft({ title: 'Salt Atlas', year: 2030 }), owners), 'salt-atlas-2030');
	});
});

describe('Kind folders: duplicates in the kind folders', () => {
	const { app, file } = fakeVault([
		{ path: `${CATALOG}/Movies/fern-road.md`, frontmatter: { kind: 'movie', title: 'Fern Road', year: 1984 } },
		{ path: `${CATALOG}/Series/Lantern Bay/lantern-bay-s02.md`, frontmatter: { kind: 'series', title: 'Lantern Bay (S02)', season: 2 } },
		{ path: `${BACKLOG}/Games/moss-engine.md`, frontmatter: { kind: 'game', title: 'Moss Engine' } },
		{ path: `${BACKLOG}/Series/Lantern Bay/lantern-bay-s03.md`, frontmatter: { kind: 'series', title: 'Edited by hand', season: 3 } },
	]);

	test('the recursive scan finds notes in kind and series folders, in both folders', () => {
		const find = (query: Parameters<typeof findInCatalogOrBacklog>[2]) => findInCatalogOrBacklog(app, SETTINGS, query);
		assert.equal(find({ kind: 'movie', title: 'Fern Road', season: null, year: 1984 }), file(`${CATALOG}/Movies/fern-road.md`));
		assert.equal(find({ kind: 'series', title: 'Lantern Bay', season: 2 }), file(`${CATALOG}/Series/Lantern Bay/lantern-bay-s02.md`));
		assert.equal(find({ kind: 'game', title: 'Moss Engine', season: null }), file(`${BACKLOG}/Games/moss-engine.md`));
		assert.equal(find({ kind: 'series', title: 'Lantern Bay', season: 1 }), null);
	});

	test('the note with the name a new note would take counts, in any subfolder', () => {
		const found = findInCatalogOrBacklog(app, SETTINGS, { kind: 'series', title: 'Lantern Bay', season: 3 });
		assert.equal(found, file(`${BACKLOG}/Series/Lantern Bay/lantern-bay-s03.md`));
	});
});

describe('Kind folders: "Move to the kind folder"', () => {
	const { app } = fakeVault(
		[
			{ path: `${CATALOG}/fern-road.md`, frontmatter: { kind: 'movie', title: 'Fern Road' } },
			{ path: `${CATALOG}/Series/Lantern Bay/lantern-bay-s01.md`, frontmatter: { kind: 'series', title: 'Lantern Bay (S01)', season: 1 } },
		],
		[`${CATALOG}/Movies`],
	);

	test('a note outside its kind folder goes there, in the catalog or the backlog', () => {
		assert.equal(misplacedTarget(app, SETTINGS, `${CATALOG}/fern-road.md`, 'movie', 'Fern Road'), `${CATALOG}/Movies`);
		assert.equal(misplacedTarget(app, SETTINGS, `${CATALOG}/Games/fern-road.md`, 'movie', 'Fern Road'), `${CATALOG}/Movies`);
		assert.equal(misplacedTarget(app, SETTINGS, `${BACKLOG}/Old/moss-engine.md`, 'game', 'Moss Engine'), `${BACKLOG}/Games`);
		assert.equal(misplacedTarget(app, SETTINGS, `${CATALOG}/lantern-bay-s02.md`, 'series', 'Lantern Bay (S02)'), `${CATALOG}/Series/Lantern Bay`);
		assert.equal(misplacedTarget(app, SETTINGS, `${BACKLOG}/lantern-bay-s04.md`, 'series', 'Lantern Bay (S04)'), `${BACKLOG}/Series/Lantern Bay`);
	});

	test('nothing to do in place or outside both folders', () => {
		assert.equal(misplacedTarget(app, SETTINGS, `${CATALOG}/Movies/fern-road.md`, 'movie', 'Fern Road'), null);
		assert.equal(misplacedTarget(app, SETTINGS, `${CATALOG}/Series/Lantern Bay/lantern-bay-s01.md`, 'series', 'Lantern Bay (S01)'), null);
		assert.equal(misplacedTarget(app, SETTINGS, `${CATALOG}/Series/Bay/lantern-bay-s05.md`, 'series', 'Lantern Bay (S05)'), null);
		assert.equal(misplacedTarget(app, SETTINGS, 'Inbox/fern-road.md', 'movie', 'Fern Road'), null);
	});

	test('a backlog folder inside the catalog folder wins for its notes', () => {
		const nested = { folder: 'Media', backlogFolder: 'Media/Backlog' };
		assert.equal(destinationOf('Media/Backlog/fern-road.md', nested), 'backlog');
		assert.equal(destinationOf('Media/Movies/fern-road.md', nested), 'catalog');
		assert.equal(destinationOf('Inbox/fern-road.md', nested), null);
	});
});

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { TFile, TFolder } from 'obsidian';
import type { App } from 'obsidian';
import { albumSourceOf, applyStart, isInFolder, setAfter, startBody, swapTags } from '../src/catalog/backlog';
import { findInCatalogOrBacklog } from '../src/catalog/duplicates';
import { catalogFrontmatter } from '../src/catalog/frontmatter';
import { writeSetting } from '../src/settings/bindings';
import { defaultSettings, normalizeSettings, tagList } from '../src/settings/settings';
import type { CatalogDraft } from '../src/types';

/** Fictional titles, artists and people only. */
const CATALOG = 'Media/DB';
const BACKLOG = 'Media/Backlog/DB';

function draft(overrides: Partial<CatalogDraft>): CatalogDraft {
	return {
		destination: 'backlog',
		kind: 'movie',
		title: 'Fern Road',
		year: 1984,
		status: 'backlog',
		rating: 8,
		started: '2031-05-01',
		finished: '2031-05-02',
		platform: 'Cinema',
		season: null,
		episodes: 8,
		hours: 12,
		author: 'Ilsa Marrow',
		pages: 300,
		estimatedHours: null,
		priority: null,
		recommendedBy: '',
		referenceArea: null,
		cover: { url: null, download: false },
		source: { provider: 'imdb', name: 'IMDb', url: null },
		tracks: [{ disc: 1, position: 1, title: 'Opening', lengthMs: 60_000 }],
		localizedTitle: null,
		...overrides,
	};
}

describe('Backlog notes: frontmatter', () => {
	test('the keys of the backlog template, without the fields of a run', () => {
		const text = catalogFrontmatter(draft({ priority: 'medium', recommendedBy: ' Ana Lumen ' }), { cover: '', reference: '', added: '2031-04-30' });
		assert.equal(
			text,
			[
				'---',
				'kind: movie',
				'title: "Fern Road"',
				'aliases: ["Fern Road"]',
				'author: "Ilsa Marrow"',
				'year: 1984',
				'status: backlog',
				'platform: "Cinema"',
				'priority: medium',
				'added: 2031-04-30',
				'recommended_by: "Ana Lumen"',
				'cover: ""',
				'tags: [backlog]',
				'---',
				'',
			].join('\n'),
		);
	});

	test('priority and recommended_by are optional: empty when not given', () => {
		const text = catalogFrontmatter(draft({ priority: null, recommendedBy: '  ' }), { cover: '', reference: '', added: '2031-04-30' });
		assert.match(text, /^priority:\nadded: 2031-04-30\nrecommended_by:\n/m);
	});

	test('series keep the season after the year; albums never get tracks', () => {
		const series = catalogFrontmatter(draft({ kind: 'series', title: 'Lantern Bay', season: 2, author: '' }), {
			cover: '',
			reference: '',
			added: '2031-04-30',
		});
		assert.match(series, /^title: "Lantern Bay \(S02\)"$/m);
		assert.match(series, /^year: 1984\nseason: 2\nstatus: backlog$/m);
		assert.doesNotMatch(series, /episodes|started|rating/);

		const album = catalogFrontmatter(draft({ kind: 'album', title: 'Salt Choir' }), { cover: '', reference: '', tracks: 1, added: '2031-04-30' });
		assert.doesNotMatch(album, /^tracks:/m);
	});

	test('catalog notes are written as before', () => {
		const text = catalogFrontmatter(draft({ destination: 'catalog', status: 'done', priority: 'high', recommendedBy: 'Ana Lumen' }), {
			cover: '',
			reference: '',
		});
		assert.match(text, /^status: done\nrating: 8\nstarted: 2031-05-01\nfinished: 2031-05-02$/m);
		assert.match(text, /^tags: \[entertainment\]$/m);
		assert.doesNotMatch(text, /priority|added|recommended_by/);
	});
});

describe('Starting a backlog item', () => {
	test('in progress, started after status, backlog keys and tag gone, added kept', () => {
		const frontmatter: Record<string, unknown> = {
			kind: 'game',
			title: 'Moss Engine',
			status: 'backlog',
			platform: 'PC',
			priority: 'high',
			added: '2031-01-10',
			recommended_by: 'Ana Lumen',
			cover: '',
			tags: ['backlog'],
		};
		applyStart(frontmatter, '2031-06-01');
		assert.deepEqual(frontmatter, {
			kind: 'game',
			title: 'Moss Engine',
			status: 'in-progress',
			started: '2031-06-01',
			platform: 'PC',
			added: '2031-01-10',
			cover: '',
			tags: ['entertainment'],
		});
		assert.deepEqual(Object.keys(frontmatter).slice(2, 4), ['status', 'started']);
	});

	test('a started key already there is set in place', () => {
		const frontmatter: Record<string, unknown> = { status: 'backlog', started: null, tags: 'backlog' };
		applyStart(frontmatter, '2031-06-01');
		assert.deepEqual(Object.entries(frontmatter), [
			['status', 'in-progress'],
			['started', '2031-06-01'],
			['tags', 'entertainment'],
		]);
	});

	test('tags: swapped in place, other tags kept, "#backlog" accepted', () => {
		const swap = { backlog: ['backlog'], catalog: ['entertainment'] };
		assert.deepEqual(swapTags(['to-play', 'backlog', 'rpg'], swap), ['to-play', 'entertainment', 'rpg']);
		assert.deepEqual(swapTags(['#backlog', 'rpg'], swap), ['entertainment', 'rpg']);
		assert.deepEqual(swapTags(['Backlog'], swap), ['entertainment']);
		assert.equal(swapTags('#backlog', swap), 'entertainment');
	});

	test('tags: entertainment never twice', () => {
		const swap = { backlog: ['backlog'], catalog: ['entertainment'] };
		assert.deepEqual(swapTags(['entertainment', 'backlog'], swap), ['entertainment']);
		assert.deepEqual(swapTags(['backlog', 'rpg', 'entertainment'], swap), ['rpg', 'entertainment']);
		assert.deepEqual(swapTags(['backlog', 'backlog'], swap), ['entertainment']);
	});

	test('tags: no backlog tag, nothing changes', () => {
		const swap = { backlog: ['backlog'], catalog: ['entertainment'] };
		assert.deepEqual(swapTags(['rpg'], swap), ['rpg']);
		assert.equal(swapTags('rpg', swap), 'rpg');
		assert.equal(swapTags(undefined, swap), undefined);
	});

	test('tags: configured lists', () => {
		const swap = { backlog: ['queue', 'wishlist'], catalog: ['media', 'log'] };
		assert.deepEqual(swapTags(['wishlist', 'rpg', 'queue'], swap), ['media', 'log', 'rpg']);
		assert.deepEqual(swapTags('queue', swap), ['media', 'log']);
		const frontmatter: Record<string, unknown> = { status: 'backlog', tags: ['queue'] };
		applyStart(frontmatter, '2031-06-01', swap);
		assert.deepEqual(frontmatter.tags, ['media', 'log']);
	});

	test('setAfter: after the key, or at the end without it', () => {
		const frontmatter: Record<string, unknown> = { kind: 'album', year: 2019, status: 'in-progress' };
		setAfter(frontmatter, 'tracks', 9, 'year');
		assert.deepEqual(Object.keys(frontmatter), ['kind', 'year', 'tracks', 'status']);
		setAfter(frontmatter, 'extra', 1, 'missing');
		assert.deepEqual(Object.keys(frontmatter), ['kind', 'year', 'tracks', 'status', 'extra']);
	});

	test('"Por que quero" becomes "Impressões", its text kept', () => {
		const content = '---\nstatus: backlog\n---\n## Por que quero\n\nA friend said so.\n\n- IMDb: https://example.com\n';
		assert.equal(startBody(content), '---\nstatus: backlog\n---\n## Impressões\n\nA friend said so.\n\n- IMDb: https://example.com\n');
	});

	test('CRLF notes keep their line endings', () => {
		assert.equal(startBody('---\r\na: 1\r\n---\r\n## Por que quero\r\nx\r\n'), '---\r\na: 1\r\n---\r\n## Impressões\r\nx\r\n');
	});

	test('a note with "Impressões" is left alone; one with neither heading gets it at the end', () => {
		const both = '## Por que quero\n\n## Impressões\n';
		assert.equal(startBody(both), both);
		assert.equal(startBody('---\na: 1\n---\nSome text.\n'), '---\na: 1\n---\nSome text.\n\n## Impressões\n');
	});

	test('headings inside code blocks do not count', () => {
		const content = '```\n## Por que quero\n```\n## Por que quero\n';
		assert.equal(startBody(content), '```\n## Por que quero\n```\n## Impressões\n');
	});
});

describe('Album source of a note', () => {
	test('MusicBrainz release group', () => {
		const content = '## Por que quero\n\n- MusicBrainz: https://musicbrainz.org/release-group/0b8f1c2e-1111-4a2b-9c3d-1234567890ab\n';
		assert.deepEqual(albumSourceOf(content), { provider: 'musicbrainz', externalId: '0b8f1c2e-1111-4a2b-9c3d-1234567890ab' });
	});

	test('iTunes collection id, new and old page addresses', () => {
		assert.deepEqual(albumSourceOf('- iTunes: https://music.apple.com/us/album/salt-choir-2019/1234567890\n'), {
			provider: 'itunes',
			externalId: '1234567890',
		});
		assert.deepEqual(albumSourceOf('- iTunes: https://itunes.apple.com/br/album/salt-choir/id987654\n'), {
			provider: 'itunes',
			externalId: '987654',
		});
	});

	test('nothing in the frontmatter or without a source line', () => {
		assert.equal(albumSourceOf('---\ncover: https://musicbrainz.org/release-group/0b8f1c2e-1111-4a2b-9c3d-1234567890ab\n---\n## Por que quero\n'), null);
		assert.equal(albumSourceOf('## Por que quero\n'), null);
	});
});

describe('Folders', () => {
	test('backlog folder setting: default, normalized, empty means the default', () => {
		assert.equal(defaultSettings().backlogFolder, '1 - Knowledge/Entertainment/Backlog/DB');
		assert.equal(normalizeSettings({ backlogFolder: ' Queue/DB/ ' }).backlogFolder, 'Queue/DB');
		assert.equal(normalizeSettings({ backlogFolder: '' }).backlogFolder, '1 - Knowledge/Entertainment/Backlog/DB');
	});

	test('tag settings: defaults, parsing, empty means the default', () => {
		const settings = defaultSettings();
		assert.equal(settings.catalogTags, 'entertainment');
		assert.equal(settings.backlogTags, 'backlog');
		assert.deepEqual(tagList('#media, log  Media,,', 'entertainment'), ['media', 'log']);
		assert.deepEqual(tagList(' , ', 'backlog'), ['backlog']);
		writeSetting(settings, 'backlogTags', ' queue, wishlist ');
		assert.equal(settings.backlogTags, 'queue, wishlist');
		assert.equal(normalizeSettings({ catalogTags: 42 }).catalogTags, 'entertainment');
	});

	test('backlog notes get the configured tags', () => {
		const text = catalogFrontmatter(draft({}), { cover: '', reference: '', added: '2031-04-30', tags: ['queue', 'wishlist'] });
		assert.match(text, /^tags: \[queue, wishlist\]$/m);
	});

	test('an old "backlog" default status becomes in progress', () => {
		assert.equal(normalizeSettings({ defaultStatus: 'backlog' }).defaultStatus, 'in-progress');
		assert.equal(normalizeSettings({ defaultStatus: 'done' }).defaultStatus, 'done');
	});

	test('isInFolder: inside the folder or its subfolders only', () => {
		assert.equal(isInFolder(`${BACKLOG}/fern-road.md`, BACKLOG), true);
		assert.equal(isInFolder(`${BACKLOG}/Old/fern-road.md`, BACKLOG), true);
		assert.equal(isInFolder(`${CATALOG}/fern-road.md`, BACKLOG), false);
		assert.equal(isInFolder('Media/Backlog/DB-old/fern-road.md', BACKLOG), false);
	});

	test('duplicates are looked for in the catalog and in the backlog', () => {
		const queued = note(`${BACKLOG}/fern-road.md`, { kind: 'movie', title: 'Fern Road', year: 1984 });
		const watched = note(`${CATALOG}/moss-engine.md`, { kind: 'game', title: 'Moss Engine' });
		const app = fakeApp({ [CATALOG]: [watched], [BACKLOG]: [queued] });
		const settings = { folder: CATALOG, backlogFolder: BACKLOG };
		assert.equal(findInCatalogOrBacklog(app, settings, { kind: 'movie', title: 'Fern Road', season: null, year: 1984 }), queued.file);
		assert.equal(findInCatalogOrBacklog(app, settings, { kind: 'game', title: 'Moss Engine', season: null }), watched.file);
		assert.equal(findInCatalogOrBacklog(app, settings, { kind: 'game', title: 'Lantern Bay', season: null }), null);
	});
});

interface FakeNote {
	file: TFile;
	frontmatter: Record<string, unknown>;
}

function note(path: string, frontmatter: Record<string, unknown>): FakeNote {
	const file = Object.assign(new TFile(), { path, extension: 'md', basename: path.replace(/^.*\/|\.md$/g, '') });
	return { file, frontmatter };
}

/** Just what findDuplicate reads: the folders and the frontmatter of their notes. */
function fakeApp(folders: Record<string, FakeNote[]>): App {
	const notes = Object.values(folders).flat();
	const roots = new Map(
		Object.entries(folders).map(([path, list]) => [path, Object.assign(new TFolder(), { path, children: list.map((entry) => entry.file) })]),
	);
	const app = {
		vault: {
			getFolderByPath: (path: string) => roots.get(path) ?? null,
			getFileByPath: (path: string) => notes.find((entry) => entry.file.path === path)?.file ?? null,
		},
		metadataCache: {
			getFileCache: (file: TFile) => ({ frontmatter: notes.find((entry) => entry.file === file)?.frontmatter }),
		},
	};
	return app as unknown as App;
}

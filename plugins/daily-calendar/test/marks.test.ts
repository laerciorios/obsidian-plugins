import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { FrontMatterCache } from 'obsidian';
import { collectMarks, finishedDays } from '../src/index/marks';
import type { MarkRules, NoteFacts } from '../src/index/marks';
import { defaultSettings, normalizeSettings } from '../src/settings/settings';

const CATALOG = '1 - Knowledge/Entertainment/DB';

const RULES: MarkRules = {
	sources: { daily: false, projects: false, meetings: false, cards: false, catalog: true },
	dailyKey: () => null,
	resolve: () => null,
	projectsProperty: 'projects',
	meetingsFolder: '_Meetings',
	cardTag: 'card',
	cardProperty: 'completed',
	catalogFolder: CATALOG,
	catalogProperty: 'finished',
	catalogDatesProperty: 'finished_dates',
};

function note(name: string, frontmatter: Record<string, unknown>, folder = CATALOG): NoteFacts {
	return { path: `${folder}/${name}.md`, basename: name, frontmatter: frontmatter as FrontMatterCache, tags: [], links: [] };
}

/** Every day of August 2026, the month on screen. */
const AUGUST = new Set(Array.from({ length: 31 }, (_, index) => `2026-08-${String(index + 1).padStart(2, '0')}`));

function catalogDays(notes: NoteFacts[], rules: MarkRules = RULES): Record<string, string[]> {
	const marks = collectMarks(notes, AUGUST, rules);
	return Object.fromEntries([...marks].sort(([a], [b]) => a.localeCompare(b)).map(([key, day]) => [key, day.catalog.map((item) => item.title)]));
}

describe('catalog: finish dates', () => {
	test('finished alone, as before', () => {
		assert.deepEqual(catalogDays([note('girassois-em-marte', { title: 'Girassóis em Marte', finished: '2026-08-02' })]), {
			'2026-08-02': ['Girassóis em Marte'],
		});
	});

	test('every date of finished_dates gets a mark', () => {
		const pomar = note('pomar-de-neon', { title: 'Pomar de Neon', finished: null, finished_dates: ['2025-03-15', '2026-08-10', '2026-08-24'] });
		assert.deepEqual(catalogDays([pomar]), { '2026-08-10': ['Pomar de Neon'], '2026-08-24': ['Pomar de Neon'] });
	});

	test('the current completion in both properties counts once', () => {
		const pomar = note('pomar-de-neon', { title: 'Pomar de Neon', finished: '2026-08-24', finished_dates: ['2026-08-10', '2026-08-24'] });
		assert.deepEqual(catalogDays([pomar]), { '2026-08-10': ['Pomar de Neon'], '2026-08-24': ['Pomar de Neon'] });
	});

	test('a date repeated in the list counts once', () => {
		const pomar = note('pomar-de-neon', { title: 'Pomar de Neon', finished_dates: ['2026-08-24', '2026-08-24T21:00'] });
		assert.deepEqual(catalogDays([pomar]), { '2026-08-24': ['Pomar de Neon'] });
	});

	test('two items on one day are both listed, by title', () => {
		const notes = [
			note('pomar-de-neon', { title: 'Pomar de Neon', finished_dates: ['2026-08-02'] }),
			note('girassois-em-marte', { title: 'Girassóis em Marte', finished: '2026-08-02' }),
		];
		assert.deepEqual(catalogDays(notes), { '2026-08-02': ['Girassóis em Marte', 'Pomar de Neon'] });
	});

	test('a single date instead of a list', () => {
		assert.deepEqual(catalogDays([note('pomar-de-neon', { title: 'Pomar de Neon', finished_dates: '2026-08-10' })]), {
			'2026-08-10': ['Pomar de Neon'],
		});
	});

	test('impossible days, text and empty entries are ignored', () => {
		const pomar = note('pomar-de-neon', { title: 'Pomar de Neon', finished_dates: ['2026-08-32', 'agosto', '', null, 20260810] });
		assert.deepEqual(catalogDays([pomar]), {});
	});

	test('notes in subfolders at any depth (a folder per kind, a folder per series)', () => {
		const notes = [
			note('girassois-em-marte', { title: 'Girassóis em Marte', finished: '2026-08-02' }, `${CATALOG}/Movies`),
			note('pomar-de-neon-s01', { title: 'Pomar de Neon (S01)', finished_dates: ['2026-08-10'] }, `${CATALOG}/Series/Pomar de Neon`),
			note('maré-alta', { title: 'Maré Alta', finished: '2026-08-10' }, `${CATALOG}/Albums/Old/2026`),
		];
		assert.deepEqual(catalogDays(notes), {
			'2026-08-02': ['Girassóis em Marte'],
			'2026-08-10': ['Maré Alta', 'Pomar de Neon (S01)'],
		});
	});

	test('a folder that only starts with the catalog name is not the catalog', () => {
		const outside = note('pomar-de-neon', { title: 'Pomar de Neon', finished: '2026-08-10' }, `${CATALOG} old/Movies`);
		assert.deepEqual(catalogDays([outside]), {});
	});

	test('only notes in the catalog folder', () => {
		const outside = note('pomar-de-neon', { title: 'Pomar de Neon', finished_dates: ['2026-08-10'] }, 'Inbox');
		assert.deepEqual(catalogDays([outside]), {});
	});

	test('the property names come from the settings', () => {
		const rules = { ...RULES, catalogDatesProperty: 'concluido_em' };
		const pomar = note('pomar-de-neon', { title: 'Pomar de Neon', finished_dates: ['2026-08-10'], concluido_em: ['2026-08-11'] });
		assert.deepEqual(catalogDays([pomar], rules), { '2026-08-11': ['Pomar de Neon'] });
	});

	test('nothing when the catalog source is off', () => {
		const rules = { ...RULES, sources: { ...RULES.sources, catalog: false } };
		assert.deepEqual(catalogDays([note('pomar-de-neon', { finished_dates: ['2026-08-10'] })], rules), {});
	});

	test('the days of a note', () => {
		const frontmatter = { finished: '2026-08-24', finished_dates: ['2023-12-31', '2026-08-24'] } as FrontMatterCache;
		assert.deepEqual([...finishedDays(frontmatter, 'finished', 'finished_dates')].sort(), ['2023-12-31', '2026-08-24']);
		assert.deepEqual([...finishedDays(undefined, 'finished', 'finished_dates')], []);
	});
});

describe('settings: finish dates property', () => {
	test('finished_dates by default', () => {
		assert.equal(defaultSettings().catalogDatesProperty, 'finished_dates');
		assert.equal(normalizeSettings({}).catalogDatesProperty, 'finished_dates');
	});

	test('a saved name is kept, trimmed; an empty one falls back to the default', () => {
		assert.equal(normalizeSettings({ catalogDatesProperty: ' concluido_em ' }).catalogDatesProperty, 'concluido_em');
		assert.equal(normalizeSettings({ catalogDatesProperty: '  ' }).catalogDatesProperty, 'finished_dates');
		assert.equal(normalizeSettings({ catalogDatesProperty: 3 }).catalogDatesProperty, 'finished_dates');
	});
});

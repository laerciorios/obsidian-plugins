import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { dayOf } from '../src/catalog/dates';
import { addFinishedDate, applyFinished, applyNewRun, currentRun, isDone } from '../src/catalog/runs';

describe('finished_dates: adding a date', () => {
	test('created with the date when the note has none', () => {
		assert.deepEqual(addFinishedDate(undefined, '2026-04-18'), ['2026-04-18']);
		assert.deepEqual(addFinishedDate(null, '2026-04-18'), ['2026-04-18']);
		assert.deepEqual(addFinishedDate([], '2026-04-18'), ['2026-04-18']);
	});

	test('in ascending order', () => {
		assert.deepEqual(addFinishedDate(['2023-12-31', '2026-09-01'], '2025-07-19'), ['2023-12-31', '2025-07-19', '2026-09-01']);
		assert.deepEqual(addFinishedDate(['2023-12-31', '2025-07-19'], '2026-09-01'), ['2023-12-31', '2025-07-19', '2026-09-01']);
		assert.deepEqual(addFinishedDate(['2026-09-01', '2023-12-31'], '2025-07-19'), ['2023-12-31', '2025-07-19', '2026-09-01']);
	});

	test('never twice', () => {
		assert.deepEqual(addFinishedDate(['2023-12-31', '2026-09-01'], '2026-09-01'), ['2023-12-31', '2026-09-01']);
		assert.deepEqual(addFinishedDate(['2026-09-01', '2026-09-01'], '2026-09-01'), ['2026-09-01']);
	});

	test('a single value counts as a list of one', () => {
		assert.deepEqual(addFinishedDate('2023-12-31', '2026-09-01'), ['2023-12-31', '2026-09-01']);
	});

	test('a date with a time counts as its day', () => {
		assert.deepEqual(addFinishedDate(['2026-09-01T21:30'], '2026-09-01'), ['2026-09-01']);
	});

	test('entries that are not dates are kept after the dates; empty ones are dropped', () => {
		assert.deepEqual(addFinishedDate(['sem data', '2025-07-19', '', null], '2023-12-31'), ['2023-12-31', '2025-07-19', 'sem data']);
	});

	test('a replaced date leaves the list', () => {
		assert.deepEqual(addFinishedDate(['2023-12-31', '2026-09-01'], '2026-09-05', '2026-09-01'), ['2023-12-31', '2026-09-05']);
	});
});

describe('"Mark as finished" with re-entries', () => {
	test('without finished_dates, only status, finished and rating change', () => {
		const frontmatter: Record<string, unknown> = { kind: 'movie', status: 'in-progress', rating: null, started: '2026-10-01', finished: null };
		applyFinished(frontmatter, '2026-10-12', 8);
		assert.deepEqual(frontmatter, { kind: 'movie', status: 'done', rating: 8, started: '2026-10-01', finished: '2026-10-12' });
		assert.equal('finished_dates' in frontmatter, false);
	});

	test('with finished_dates, the date goes there too', () => {
		const frontmatter: Record<string, unknown> = {
			status: 'in-progress',
			started: '2026-10-01',
			finished: null,
			finished_dates: ['2023-12-31', '2025-07-19'],
		};
		applyFinished(frontmatter, '2026-10-12', null);
		assert.deepEqual(frontmatter.finished_dates, ['2023-12-31', '2025-07-19', '2026-10-12']);
		assert.equal(frontmatter.finished, '2026-10-12');
		assert.equal(frontmatter.status, 'done');
	});

	test('an empty finished_dates key gets the date', () => {
		const frontmatter: Record<string, unknown> = { status: 'in-progress', finished: null, finished_dates: null };
		applyFinished(frontmatter, '2026-10-12', null);
		assert.deepEqual(frontmatter.finished_dates, ['2026-10-12']);
	});

	test('marking a done note again moves its completion in the list', () => {
		const frontmatter: Record<string, unknown> = { status: 'done', finished: '2026-10-01', finished_dates: ['2025-07-19', '2026-10-01'] };
		applyFinished(frontmatter, '2026-10-12', 9);
		assert.deepEqual(frontmatter.finished_dates, ['2025-07-19', '2026-10-12']);
		assert.equal(frontmatter.rating, 9);
	});

	test('a rating left out stays as it was', () => {
		const frontmatter: Record<string, unknown> = { status: 'in-progress', rating: 7, finished: null };
		applyFinished(frontmatter, '2026-10-12', null);
		assert.equal(frontmatter.rating, 7);
	});
});

describe('"New run": properties', () => {
	test('a first re-entry creates finished_dates right after finished', () => {
		const frontmatter: Record<string, unknown> = {
			kind: 'game',
			title: 'Semente Eterna',
			status: 'done',
			rating: 9,
			started: '2026-03-05',
			finished: '2026-04-18',
			platform: 'PC',
			hours: 42,
			cover: '',
			tags: ['entertainment'],
		};
		applyNewRun(frontmatter, { started: '2026-10-12', platform: 'Console Verde' });
		assert.deepEqual(Object.keys(frontmatter), ['kind', 'title', 'status', 'rating', 'started', 'finished', 'finished_dates', 'platform', 'hours', 'cover', 'tags']);
		assert.deepEqual(frontmatter, {
			kind: 'game',
			title: 'Semente Eterna',
			status: 'in-progress',
			rating: 9,
			started: '2026-10-12',
			finished: null,
			finished_dates: ['2026-04-18'],
			platform: 'Console Verde',
			hours: null,
			cover: '',
			tags: ['entertainment'],
		});
	});

	test('an existing list gets the finish date in order, without repeats', () => {
		const frontmatter: Record<string, unknown> = {
			kind: 'movie',
			status: 'done',
			started: '2026-09-01',
			finished: '2026-09-01',
			finished_dates: ['2023-12-31', '2025-07-19', '2026-09-01'],
			platform: 'Cinema',
		};
		applyNewRun(frontmatter, { started: '2026-10-12', platform: 'Streaming' });
		assert.deepEqual(frontmatter.finished_dates, ['2023-12-31', '2025-07-19', '2026-09-01']);
		assert.equal(frontmatter.started, '2026-10-12');
		assert.equal(frontmatter.finished, null);
		assert.equal(frontmatter.status, 'in-progress');
		assert.equal(frontmatter.platform, 'Streaming');
		// Movies have no hours: the key is not added.
		assert.equal('hours' in frontmatter, false);
	});

	test('the list is placed in the note where it already is', () => {
		const frontmatter: Record<string, unknown> = { status: 'done', finished: '2026-04-18', finished_dates: ['2024-01-02'], platform: 'PC' };
		applyNewRun(frontmatter, { started: '2026-10-12', platform: 'PC' });
		assert.deepEqual(Object.keys(frontmatter), ['status', 'finished', 'finished_dates', 'platform', 'started']);
		assert.deepEqual(frontmatter.finished_dates, ['2024-01-02', '2026-04-18']);
	});

	test('without a finish date, no list is created', () => {
		const frontmatter: Record<string, unknown> = { status: 'done', finished: null, platform: '' };
		applyNewRun(frontmatter, { started: '2026-10-12', platform: '' });
		assert.equal('finished_dates' in frontmatter, false);
		assert.equal(frontmatter.platform, '');
	});

	test('rating stays: it is the current opinion', () => {
		const frontmatter: Record<string, unknown> = { status: 'done', rating: 6, finished: '2026-09-01' };
		applyNewRun(frontmatter, { started: '2026-10-12', platform: '' });
		assert.equal(frontmatter.rating, 6);
		// A note without `platform` gets it only when the new run has one.
		assert.equal('platform' in frontmatter, false);
	});
});

describe('the current run, from the frontmatter', () => {
	test('dates, platform, hours and rating', () => {
		assert.deepEqual(
			currentRun({ started: '2025-12-21', finished: '2026-01-08', platform: 'Mobile', hours: 14.3, rating: 10, status: 'done' }),
			{ started: '2025-12-21', finished: '2026-01-08', platform: 'Mobile', hours: 14.3, rating: 10 },
		);
	});

	test('empty and odd values', () => {
		assert.deepEqual(currentRun({ started: '', finished: null, platform: '  ', hours: '3.5', rating: 'dez' }), {
			started: null,
			finished: null,
			platform: '',
			hours: 3.5,
			rating: null,
		});
	});

	test('only done notes start a new run', () => {
		assert.equal(isDone({ status: 'done' }), true);
		assert.equal(isDone({ status: 'in-progress' }), false);
		assert.equal(isDone({}), false);
		assert.equal(isDone(null), false);
	});

	test('days of date values', () => {
		assert.equal(dayOf('2026-09-30'), '2026-09-30');
		assert.equal(dayOf(' 2026-09-30T18:30 '), '2026-09-30');
		assert.equal(dayOf('2026-09-30 18:30'), '2026-09-30');
		assert.equal(dayOf('2026-02-30'), null);
		assert.equal(dayOf('2026-09-300'), null);
		assert.equal(dayOf(20260930), null);
		assert.equal(dayOf(['2026-09-30']), null);
	});
});

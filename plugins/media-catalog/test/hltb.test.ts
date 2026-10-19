import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { catalogFrontmatter } from '../src/catalog/frontmatter';
import { estimatedHours, measureHours, parseHltb, pickGame, roundHalfHour, searchBody } from '../src/providers/hltb';
import type { HltbGame } from '../src/providers/hltb';
import { DEFAULT_SEARCH_PATH, HltbSession, parseInit, scriptsIn, searchPathIn } from '../src/providers/hltb-session';
import { defaultSettings, normalizeSettings } from '../src/settings/settings';
import type { CatalogDraft } from '../src/types';

/** Fictional games, shaped like a HowLongToBeat search answer (times in seconds). */
const ANSWER = {
	color: 'blue',
	title: '',
	category: 'games',
	count: 5,
	data: [
		{
			game_id: 101,
			game_name: 'Moss Engine',
			game_alias: "Moss Engine: Director's Cut, Moss Engine DC",
			game_type: 'game',
			release_world: 2029,
			comp_main: 85_466,
			comp_plus: 119_942,
			comp_100: 174_225,
		},
		{ game_id: 102, game_name: 'Moss Engine: Pocket Edition', game_alias: '', game_type: 'game', release_world: 2030, comp_main: 1387, comp_plus: 2400, comp_100: 0 },
		{ game_id: 103, game_name: 'Lantern Keep', game_alias: '', game_type: 'game', release_world: 2005, comp_main: 56_000, comp_plus: 70_314, comp_100: null },
		{ game_id: 104, game_name: 'Lantern Keep', game_alias: 'Lantern Keep Remake', game_type: 'game', release_world: 2023, comp_main: 60_000, comp_plus: 78_350 },
		{ game_id: 105, game_name: 'Lantern Keep - Side Path', game_alias: '', game_type: 'dlc', release_world: 2023, comp_plus: 21_866 },
		{ game_name: 'No id' },
		'odd entry',
	],
};

function game(overrides: Partial<HltbGame>): HltbGame {
	return { id: 1, name: 'Fern Road', aliases: [], year: 2031, type: 'game', main: 10, mainExtra: 20, completionist: 30, ...overrides };
}

describe('HowLongToBeat: reading the answer', () => {
	test('games in order, times in hours, aliases split', () => {
		const games = parseHltb(ANSWER);
		assert.deepEqual(
			games.map((entry) => entry.id),
			[101, 102, 103, 104, 105],
		);
		const [moss] = games;
		assert.deepEqual(moss?.aliases, ["Moss Engine: Director's Cut", 'Moss Engine DC']);
		assert.equal(moss?.year, 2029);
		assert.ok(Math.abs((moss?.mainExtra ?? 0) - 33.317) < 0.001);
	});

	test('zero, null and missing times are null', () => {
		const games = parseHltb(ANSWER);
		assert.equal(games[1]?.completionist, null);
		assert.equal(games[2]?.completionist, null);
		assert.equal(games[3]?.completionist, null);
		assert.equal(games[4]?.main, null);
	});

	test('anything else is an empty list', () => {
		assert.deepEqual(parseHltb(null), []);
		assert.deepEqual(parseHltb({ data: 'x' }), []);
		assert.deepEqual(parseHltb({ count: 0 }), []);
	});

	test('the request body has the words of the title and the extra fields', () => {
		const body = JSON.parse(searchBody('  Moss  Engine: DC ', { abc: 'xyz' })) as Record<string, unknown>;
		assert.deepEqual(body.searchTerms, ['Moss', 'Engine:', 'DC']);
		assert.equal(body.searchType, 'games');
		assert.equal(body.abc, 'xyz');
	});
});

describe('HowLongToBeat: picking the game', () => {
	const games = parseHltb(ANSWER);

	test('by name, case and punctuation ignored', () => {
		const match = pickGame(games, 'moss engine', null);
		assert.equal(match.status === 'found' && match.game.id, 101);
	});

	test('by alias: the edition the user has', () => {
		const match = pickGame(games, 'Moss Engine - Directors Cut', 2032);
		assert.equal(match.status === 'found' && match.game.id, 101);
	});

	test('two games with the title: the year decides', () => {
		const match = pickGame(games, 'Lantern Keep', 2005);
		assert.equal(match.status === 'found' && match.game.id, 103);
		assert.equal(pickGame(games, 'Lantern Keep', 2023).status === 'found', true);
	});

	test('two games and no year (or another one): ambiguous', () => {
		assert.equal(pickGame(games, 'Lantern Keep', null).status, 'ambiguous');
		assert.equal(pickGame(games, 'Lantern Keep', 2010).status, 'ambiguous');
	});

	test('a DLC counts only without a game of that title', () => {
		const match = pickGame(games, 'Lantern Keep Side Path', null);
		assert.equal(match.status === 'found' && match.game.id, 105);
	});

	test('a title that is only part of a name is not found', () => {
		assert.equal(pickGame(games, 'Moss', null).status, 'none');
		assert.equal(pickGame(games, '', null).status, 'none');
		assert.equal(pickGame([], 'Moss Engine', null).status, 'none');
	});
});

describe('HowLongToBeat: hours', () => {
	test('the measure of the settings', () => {
		const entry = game({});
		assert.equal(measureHours(entry, 'main'), 10);
		assert.equal(measureHours(entry, 'main-extra'), 20);
		assert.equal(measureHours(entry, 'completionist'), 30);
		assert.equal(measureHours(entry, 'off'), null);
	});

	test('rounded to half an hour', () => {
		assert.equal(roundHalfHour(33.317), 33.5);
		assert.equal(roundHalfHour(33.2), 33);
		assert.equal(roundHalfHour(33.75), 34);
		assert.equal(roundHalfHour(0.1), 0.5);
		assert.equal(roundHalfHour(0), null);
		assert.equal(roundHalfHour(null), null);
		assert.equal(roundHalfHour(Number.NaN), null);
	});

	test('estimated hours: measure, then rounding', () => {
		assert.equal(estimatedHours(game({ mainExtra: 119_942 / 3600 }), 'main-extra'), 33.5);
		assert.equal(estimatedHours(game({ completionist: null }), 'completionist'), null);
	});

	test('Main + Extra by default; unknown values keep the default', () => {
		assert.equal(defaultSettings().hltbMeasure, 'main-extra');
		assert.equal(normalizeSettings({ hltbMeasure: 'completionist' }).hltbMeasure, 'completionist');
		assert.equal(normalizeSettings({ hltbMeasure: 'off' }).hltbMeasure, 'off');
		assert.equal(normalizeSettings({ hltbMeasure: 'all-styles' }).hltbMeasure, 'main-extra');
	});
});

describe('HowLongToBeat: endpoint and token', () => {
	test('init: the token; key/value pairs of older versions go to headers and body', () => {
		const url = 'https://howlongtobeat.com/api/search/site';
		const auth = parseInit({ token: 'abc' }, url);
		assert.equal(auth?.url, url);
		assert.equal(auth?.headers['x-auth-token'], 'abc');
		assert.deepEqual(auth?.body, {});
		const older = parseInit({ token: 'abc', hpKey: 'k1', hpVal: 'v1' }, url);
		assert.equal(older?.headers['x-hp-key'], 'k1');
		assert.equal(older?.headers['x-hp-val'], 'v1');
		assert.deepEqual(older?.body, { k1: 'v1' });
		assert.equal(parseInit({ token: '' }, url), null);
		assert.equal(parseInit('nope', url), null);
	});

	test('the search endpoint in a script: a POST with "search", not the others', () => {
		const script =
			'a=fetch("/api/error",{method:"POST",body:x});b=await fetch("/api/find/v3",{method:"POST",headers:{}});' +
			'c=fetch("/api/search/v9/",{method:"POST",headers:{"x-auth-token":t}});d=fetch("/api/search/other")';
		assert.equal(searchPathIn(script), '/api/search/v9');
		assert.equal(searchPathIn('fetch("/api/error",{method:"POST"})'), null);
	});

	test('the scripts of the home page, once each', () => {
		const html = '<script src="/_next/static/chunks/a1-b.js"></script><script src="/_next/static/chunks/a1-b.js"></script><script src="/x.js"></script><script src="/_next/static/chunks/pages/c.js"></script>';
		assert.deepEqual(scriptsIn(html), ['/_next/static/chunks/a1-b.js', '/_next/static/chunks/pages/c.js']);
	});

	test('session: the known endpoint first, the token reused until it expires', async () => {
		let now = 1_000;
		const calls: string[] = [];
		const session = new HltbSession(
			{
				getJson: (url) => {
					calls.push(url);
					return Promise.resolve({ token: `t${calls.length}` });
				},
				getText: () => Promise.reject(new Error('not needed')),
			},
			() => now,
		);
		assert.equal((await session.auth()).headers['x-auth-token'], 't1');
		assert.equal(calls[0], `https://howlongtobeat.com${DEFAULT_SEARCH_PATH}/init?t=1000`);
		assert.equal((await session.auth()).headers['x-auth-token'], 't1');
		now += 11 * 60_000;
		assert.equal((await session.auth()).headers['x-auth-token'], 't2');
		session.invalidate();
		assert.equal((await session.auth()).headers['x-auth-token'], 't3');
	});

	test('session: a moved endpoint is found in the scripts', async () => {
		const session = new HltbSession({
			getJson: (url) =>
				url.startsWith('https://howlongtobeat.com/api/search/v9/init') ? Promise.resolve({ token: 'new' }) : Promise.reject(new Error('404')),
			getText: (url) => {
				if (url === 'https://howlongtobeat.com/') return Promise.resolve('<script src="/_next/static/chunks/x.js"></script>');
				return Promise.resolve('fetch("/api/search/v9",{method:"POST"})');
			},
		});
		const auth = await session.auth();
		assert.equal(auth.url, 'https://howlongtobeat.com/api/search/v9');
		assert.equal(auth.headers['x-auth-token'], 'new');
	});

	test('session: no endpoint anywhere rejects', async () => {
		const session = new HltbSession({
			getJson: () => Promise.reject(new Error('404')),
			getText: () => Promise.resolve('<html></html>'),
		});
		await assert.rejects(session.auth());
	});
});

describe('estimated_hours in the frontmatter', () => {
	function draft(overrides: Partial<CatalogDraft>): CatalogDraft {
		return {
			destination: 'backlog',
			kind: 'game',
			title: 'Moss Engine',
			year: 2029,
			status: 'backlog',
			rating: null,
			started: null,
			finished: null,
			platform: 'PC',
			season: null,
			episodes: null,
			hours: 12,
			author: '',
			pages: null,
			estimatedHours: 33.5,
			priority: 'medium',
			recommendedBy: '',
			referenceArea: null,
			cover: { url: null, download: false },
			source: { provider: 'igdb', name: 'IGDB', url: null },
			tracks: null,
			localizedTitle: null,
			...overrides,
		};
	}

	test('backlog games: right after platform, a YAML number', () => {
		const text = catalogFrontmatter(draft({}), { cover: '', reference: '', added: '2031-04-30' });
		assert.match(text, /^platform: "PC"\nestimated_hours: 33\.5\npriority: medium$/m);
		assert.doesNotMatch(text, /^hours:/m);
	});

	test('empty when not known', () => {
		const text = catalogFrontmatter(draft({ estimatedHours: null }), { cover: '', reference: '', added: '2031-04-30' });
		assert.match(text, /^estimated_hours:\n/m);
	});

	test('never in catalog notes or other kinds', () => {
		const catalog = catalogFrontmatter(draft({ destination: 'catalog', status: 'in-progress' }), { cover: '', reference: '' });
		assert.doesNotMatch(catalog, /estimated_hours/);
		assert.match(catalog, /^hours: 12$/m);
		const movie = catalogFrontmatter(draft({ kind: 'movie' }), { cover: '', reference: '', added: '2031-04-30' });
		assert.doesNotMatch(movie, /estimated_hours/);
	});
});

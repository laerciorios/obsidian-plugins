import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { igdbRegions, localizationsQuery, parseLocalizations, pickLocalization, regionKey } from '../src/providers/igdb';
import { parseImdbTitle, titleHeaders, titleQuery } from '../src/providers/imdb';
import { parseAkas } from '../src/providers/tvmaze';

/** Shape of IMDb's GraphQL answers (fictional titles). */
const DISCLAIMER = {
	disclaimer: 'Public, commercial, and/or non-private use of the IMDb data provided by this API is not allowed.',
	experimentalFields: { janet: [] },
};

describe('IMDb: title of a country', () => {
	test('reads data.title.titleText.text', () => {
		const json = { data: { title: { titleText: { text: 'Estrada das Samambaias' } } }, extensions: DISCLAIMER };
		assert.equal(parseImdbTitle(json), 'Estrada das Samambaias');
	});

	test('trims the text', () => {
		assert.equal(parseImdbTitle({ data: { title: { titleText: { text: '  Camino de Helechos ' } } } }), 'Camino de Helechos');
	});

	test('unknown id: titleText is null', () => {
		assert.equal(parseImdbTitle({ data: { title: { titleText: null } }, extensions: DISCLAIMER }), null);
	});

	test('malformed id: title is null and errors come along', () => {
		const json = {
			errors: [{ message: 'xyz is not a valid ID for type with prefix tt', extensions: { code: 'BAD_USER_INPUT' } }],
			data: { title: null },
		};
		assert.equal(parseImdbTitle(json), null);
	});

	test('anything else gives null', () => {
		for (const json of [null, undefined, 'x', [], {}, { data: null }, { data: { title: { titleText: { text: '' } } } }, { data: { title: { titleText: { text: 42 } } } }]) {
			assert.equal(parseImdbTitle(json), null, JSON.stringify(json));
		}
	});

	test('asks for the title of the id', () => {
		assert.deepEqual(JSON.parse(titleQuery('tt7654321')), { query: '{ title(id:"tt7654321") { titleText { text } } }' });
	});

	test('sends the country, its language and the imdb.com origin', () => {
		assert.deepEqual(titleHeaders('JP'), {
			Origin: 'https://www.imdb.com',
			Referer: 'https://www.imdb.com/',
			'x-imdb-user-country': 'JP',
			'x-imdb-user-language': 'ja-JP',
		});
		assert.equal(titleHeaders('BR')['x-imdb-user-language'], 'pt-BR');
	});
});

describe('TVmaze: akas', () => {
	const akas = [
		{ name: 'Horta Wild', country: null },
		{ name: 'Wilder Garten', country: { name: 'Germany', code: 'DE', timezone: 'Europe/Busingen' } },
		{ name: 'Horta Brava', country: { name: 'Brazil', code: 'BR', timezone: 'America/Noronha' } },
		{ name: 'Horta Brava 2', country: { name: 'Brazil', code: 'BR', timezone: 'America/Noronha' } },
	];

	test('the first name of the country', () => {
		assert.equal(parseAkas(akas, 'BR'), 'Horta Brava');
		assert.equal(parseAkas(akas, 'DE'), 'Wilder Garten');
	});

	test('no name for the country: null', () => {
		assert.equal(parseAkas(akas, 'PT'), null);
		assert.equal(parseAkas([], 'BR'), null);
	});

	test('names without a country never match', () => {
		assert.equal(parseAkas([{ name: 'Horta Wild', country: null }], 'BR'), null);
	});

	test('codes compare without case; entries without a name are skipped', () => {
		const odd = [{ country: { code: 'BR' } }, { name: '  ', country: { code: 'BR' } }, { name: 'Horta Brava', country: { code: 'br' } }];
		assert.equal(parseAkas(odd, 'BR'), 'Horta Brava');
	});

	test('anything but a list gives null', () => {
		for (const json of [null, undefined, 'x', {}, { name: 'Horta Brava', country: { code: 'BR' } }]) {
			assert.equal(parseAkas(json, 'BR'), null, JSON.stringify(json));
		}
	});
});

describe('IGDB: game localizations', () => {
	const json = [
		{
			id: 7,
			game_localizations: [
				{ id: 1, name: 'Musgo Monogatari', region: { id: 5, identifier: 'japan', name: 'Japan' } },
				{ id: 2, name: 'Moss Quest: Europa', region: { id: 1, name: 'Europe' } },
				{ id: 3, name: 'Busca do Musgo', region: { id: 10, identifier: 'brazil', name: 'Brazil' } },
				{ id: 4, name: 'No region' },
			],
		},
	];

	test('regions of a country: its own, then its continent', () => {
		assert.deepEqual(igdbRegions('BR'), ['brazil']);
		assert.deepEqual(igdbRegions('PT'), ['europe']);
		assert.deepEqual(igdbRegions('US'), ['north_america']);
		assert.deepEqual(igdbRegions('JP'), ['japan']);
		assert.deepEqual(igdbRegions('AR'), []);
	});

	test('region keys from identifiers or names', () => {
		assert.equal(regionKey('North America'), 'north_america');
		assert.equal(regionKey('north-america'), 'north_america');
		assert.equal(regionKey(' New Zealand '), 'new_zealand');
	});

	test('picks the localization of the country', () => {
		const localizations = parseLocalizations(json);
		assert.equal(localizations.length, 3);
		assert.equal(pickLocalization(localizations, igdbRegions('BR')), 'Busca do Musgo');
		assert.equal(pickLocalization(localizations, igdbRegions('JP')), 'Musgo Monogatari');
		assert.equal(pickLocalization(localizations, igdbRegions('PT')), 'Moss Quest: Europa');
		assert.equal(pickLocalization(localizations, igdbRegions('US')), null);
	});

	test('no game or no localizations: nothing', () => {
		assert.deepEqual(parseLocalizations([]), []);
		assert.deepEqual(parseLocalizations([{ id: 7 }]), []);
		assert.deepEqual(parseLocalizations({}), []);
	});

	test('asks one game by id', () => {
		assert.equal(
			localizationsQuery('7'),
			'fields game_localizations.name,game_localizations.region.identifier,game_localizations.region.name; where id = 7;',
		);
	});
});

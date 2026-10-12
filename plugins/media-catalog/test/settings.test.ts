import assert from 'node:assert/strict';
import { test } from 'node:test';
import { writeSetting } from '../src/settings/bindings';
import { aliasCountry, defaultSettings, normalizeSettings } from '../src/settings/settings';

test('alias country: none by default', () => {
	assert.equal(defaultSettings().aliasCountry, '');
	assert.equal(normalizeSettings({}).aliasCountry, '');
});

test('alias country: a listed ISO code, case ignored; anything else keeps the fallback', () => {
	assert.equal(aliasCountry('BR', ''), 'BR');
	assert.equal(aliasCountry(' pt ', ''), 'PT');
	assert.equal(aliasCountry('XX', 'JP'), 'JP');
	assert.equal(aliasCountry(42, ''), '');
	assert.equal(aliasCountry('', 'BR'), '');
	assert.equal(normalizeSettings({ aliasCountry: 'fr' }).aliasCountry, 'FR');
});

test('alias country: written by the settings dropdown', () => {
	const settings = defaultSettings();
	assert.equal(writeSetting(settings, 'aliasCountry', 'ES'), true);
	assert.equal(settings.aliasCountry, 'ES');
	writeSetting(settings, 'aliasCountry', 'nowhere');
	assert.equal(settings.aliasCountry, 'ES');
	writeSetting(settings, 'aliasCountry', '');
	assert.equal(settings.aliasCountry, '');
});

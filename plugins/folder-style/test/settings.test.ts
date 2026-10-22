import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { defaultSettings, normalizeSettings } from '../src/settings/settings';

describe('loading data.json', () => {
	test('nothing saved yet gives the defaults', () => {
		const defaults = { version: 1, opacity: 0.12, tintChildren: true, symbolSize: 1, folders: {} };
		assert.deepEqual(normalizeSettings(null), defaults);
		assert.deepEqual(normalizeSettings(undefined), defaults);
		assert.deepEqual(normalizeSettings({}), defaults);
		assert.deepEqual(normalizeSettings('broken'), defaults);
	});

	test('saved values are kept', () => {
		const saved = {
			version: 1,
			opacity: 0.3,
			tintChildren: false,
			symbolSize: 1.25,
			folders: {
				Reading: { symbol: { kind: 'lucide', value: 'book-open' }, color: { kind: 'preset', value: 'blue' } },
				'Work/Clients': { symbol: { kind: 'text', value: '💼' }, color: { kind: 'hex', value: '#d97706' } },
			},
		};
		assert.deepEqual(normalizeSettings(saved), saved);
	});

	test('missing or wrong global options fall back to the defaults one by one', () => {
		const settings = normalizeSettings({ opacity: '0.3', tintChildren: 'yes', symbolSize: null, folders: [] });
		assert.deepEqual(settings, defaultSettings());
		assert.equal(normalizeSettings({ opacity: 0.2 }).opacity, 0.2);
	});

	test('numbers out of range are clamped', () => {
		assert.equal(normalizeSettings({ opacity: 3 }).opacity, 0.5);
		assert.equal(normalizeSettings({ opacity: -1 }).opacity, 0);
		assert.equal(normalizeSettings({ symbolSize: 10 }).symbolSize, 2);
		assert.equal(normalizeSettings({ symbolSize: 0 }).symbolSize, 0.5);
		assert.equal(normalizeSettings({ opacity: Number.NaN }).opacity, 0.12);
	});

	test('a broken symbol or color is dropped, the rest of the folder stays', () => {
		const settings = normalizeSettings({
			folders: {
				A: { symbol: { kind: 'emoji', value: 'x' }, color: { kind: 'preset', value: 'blue' } },
				B: { symbol: { kind: 'text', value: '★' }, color: { kind: 'preset', value: 'magenta' } },
				C: { symbol: { kind: 'lucide', value: 42 }, color: { kind: 'hex', value: 'not a color' } },
			},
		});
		assert.deepEqual(settings.folders, {
			A: { color: { kind: 'preset', value: 'blue' } },
			B: { symbol: { kind: 'text', value: '★' } },
		});
	});

	test('the vault root and empty entries are dropped', () => {
		const settings = normalizeSettings({
			folders: { '/': { symbol: { kind: 'text', value: '★' } }, '': { symbol: { kind: 'text', value: '★' } }, Empty: {}, Bad: 'x' },
		});
		assert.deepEqual(settings.folders, {});
	});
});

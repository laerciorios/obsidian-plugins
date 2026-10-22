import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { PRESET_FEATURE_IDS, defaultConfig, normalizeConfig } from '../src/config/normalize';
import { pickNative } from '../src/features/presets/config';
import { applyPreset, presetFeaturesOn, snapshot, upsertPreset } from '../src/features/presets/snapshot';

function ids(): () => string {
	let next = 0;
	return () => `p${++next}`;
}

describe('presets', () => {
	test('a snapshot copies every feature but presets, deeply', () => {
		const config = defaultConfig();
		const saved = snapshot(config, PRESET_FEATURE_IDS);
		assert.deepEqual(Object.keys(saved), ['labels', 'link-types', 'images', 'shapes', 'opacity', 'icons', 'size']);
		config.features.labels.properties.push('aliases');
		assert.deepEqual(saved.labels?.properties, ['title']);
	});

	test('applying replaces only the features in the preset and marks it current', () => {
		const config = defaultConfig();
		const work = { ...defaultConfig().features.images, enabled: true };
		applyPreset(config, { id: 'w', name: 'Work', features: { images: work }, native: null });
		assert.equal(config.features.images.enabled, true);
		assert.equal(config.features.labels.enabled, true);
		assert.equal(config.features.presets.current, 'w');
		work.enabled = false;
		assert.equal(config.features.images.enabled, true);
	});

	test('saving under an existing name replaces that preset', () => {
		const items = [{ id: 'a', name: 'Work', features: {}, native: null }];
		const next = ids();
		const replaced = upsertPreset(items, ' work ', { labels: defaultConfig().features.labels }, null, next);
		assert.equal(replaced.id, 'a');
		assert.equal(items.length, 1);
		upsertPreset(items, 'Study', {}, null, next);
		assert.deepEqual(items.map((item) => [item.id, item.name]), [['a', 'work'], ['p1', 'Study']]);
	});

	test('features on in a preset', () => {
		const config = defaultConfig();
		const preset = { id: 'x', name: 'X', features: snapshot(config, PRESET_FEATURE_IDS), native: null };
		assert.deepEqual(presetFeaturesOn(preset, PRESET_FEATURE_IDS), ['labels']);
	});

	test('only search, filters and color groups of the native graph are kept', () => {
		const native = pickNative({
			search: 'path:Work',
			showTags: true,
			showOrphans: 'no',
			colorGroups: [{ query: 'tag:#a', color: { a: 1, rgb: 255 } }, { query: 3 }],
			repelStrength: 10,
			scale: 2,
		});
		assert.deepEqual(native, { search: 'path:Work', showTags: true, colorGroups: [{ query: 'tag:#a', color: { a: 1, rgb: 255 } }] });
	});

	test('saved presets are read with each feature\'s own reader', () => {
		const { config, warnings } = normalizeConfig({
			features: {
				presets: {
					enabled: true,
					current: 'w',
					items: [
						{ id: 'w', name: 'Work', features: { labels: { properties: ['name'], scope: 'nope' }, sparkles: {} }, native: { search: 'x', forces: 1 } },
						{ id: 'w', name: 'Duplicate' },
						{ id: 'e', name: '  ' },
					],
				},
			},
		});
		const [work] = config.features.presets.items;
		assert.equal(config.features.presets.items.length, 1);
		assert.deepEqual(work?.features.labels?.properties, ['name']);
		assert.equal(work?.features.labels?.scope, 'all');
		assert.deepEqual(work?.native, { search: 'x' });
		assert.equal(config.features.presets.current, 'w');
		assert.deepEqual(warnings, [
			'features.presets.items[0].features.sparkles',
			'features.presets.items[0].features.labels.scope',
			'features.presets.items[1]',
			'features.presets.items[2]',
		]);
	});
});

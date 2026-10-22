import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { exportConfig, parseImport } from '../src/config/io';
import { defaultConfig, normalizeConfig } from '../src/config/normalize';

function ids(): () => string {
	let next = 0;
	return () => `id${++next}`;
}

describe('loading data.json', () => {
	test('nothing saved yet gives the defaults: only labels on, with "title"', () => {
		for (const saved of [null, undefined, {}]) {
			const { config, warnings } = normalizeConfig(saved);
			assert.deepEqual(config, defaultConfig());
			assert.deepEqual(warnings, []);
		}
		const labels = defaultConfig().features.labels;
		assert.equal(labels.enabled, true);
		assert.deepEqual(labels.properties, ['title']);
		assert.deepEqual(labels.graphs, { global: true, local: true });
	});

	test('a valid config is kept as is', () => {
		const saved = {
			version: 1,
			enabled: false,
			features: {
				labels: {
					enabled: true,
					graphs: { global: true, local: false },
					properties: ['title', 'aliases'],
					scope: 'matching',
					maxLength: 40,
					rules: [
						{
							id: 'abc123',
							name: 'Project notes',
							enabled: false,
							match: 'any',
							conditions: [
								{ type: 'filename', value: 'index', not: false },
								{ type: 'folder', path: 'Work', subfolders: true, not: true },
								{ type: 'tag', tag: 'project', nested: false, not: false },
								{ type: 'propertyExists', key: 'title', not: false },
								{ type: 'propertyEquals', key: 'type', value: 'project', not: false },
							],
							effect: { properties: ['title'] },
						},
						{ id: 'def456', name: '', enabled: true, match: 'all', conditions: [], effect: { native: true } },
					],
				},
			},
		};
		const { config, warnings } = normalizeConfig(saved);
		assert.deepEqual(config, { ...saved, features: { ...defaultConfig().features, ...saved.features } });
		assert.deepEqual(warnings, []);
	});

	test('wrong values fall back one by one, with the path of each', () => {
		const { config, warnings } = normalizeConfig({
			enabled: 'yes',
			extra: 1,
			features: { labels: { scope: 'some', maxLength: 2.5, properties: ['title', 3, ' title '], graphs: { global: 0 } }, sparkles: {} },
		});
		assert.equal(config.enabled, true);
		assert.equal(config.features.labels.scope, 'all');
		assert.equal(config.features.labels.maxLength, 0);
		assert.deepEqual(config.features.labels.properties, ['title']);
		assert.deepEqual(config.features.labels.graphs, { global: true, local: true });
		assert.deepEqual(warnings.sort(), [
			'enabled',
			'extra',
			'features.labels.graphs.global',
			'features.labels.maxLength',
			'features.labels.properties[1]',
			'features.labels.scope',
			'features.sparkles',
		]);
	});

	test('broken rules: a bad effect drops the rule, a bad condition only that condition', () => {
		const { config, warnings } = normalizeConfig(
			{
				features: {
					labels: {
						rules: [
							{ name: 'no effect', conditions: [] },
							{ name: 'kept', conditions: [{ type: 'colour' }, { type: 'tag', tag: '#Done' }, { type: 'filename', value: '' }], effect: { properties: ['', 'name'] } },
							'junk',
						],
					},
				},
			},
			ids(),
		);
		assert.deepEqual(config.features.labels.rules, [
			{ id: 'id1', name: 'kept', enabled: true, match: 'all', conditions: [{ type: 'tag', tag: 'Done', nested: true, not: false }], effect: { properties: ['name'] } },
		]);
		assert.deepEqual(warnings, [
			'features.labels.rules[0].effect',
			'features.labels.rules[1].conditions[0]',
			'features.labels.rules[1].conditions[2]',
			'features.labels.rules[2]',
		]);
	});

	test('duplicate or missing rule ids get new ones', () => {
		const rule = { id: 'same', conditions: [], effect: { native: true } };
		const { config } = normalizeConfig({ features: { labels: { rules: [rule, rule, { ...rule, id: 'bad id!' }] } } }, ids());
		assert.deepEqual(
			config.features.labels.rules.map((r) => r.id),
			['same', 'id1', 'id2'],
		);
	});

	test('maximum length is clamped', () => {
		assert.equal(normalizeConfig({ features: { labels: { maxLength: 9999 } } }).config.features.labels.maxLength, 500);
		assert.equal(normalizeConfig({ features: { labels: { maxLength: -3 } } }).config.features.labels.maxLength, 0);
	});

	test('a newer version is read as far as possible, with a warning', () => {
		const { config, warnings } = normalizeConfig({ version: 2, enabled: false });
		assert.equal(config.enabled, false);
		assert.deepEqual(warnings, ['version']);
	});
});

describe('export and import', () => {
	test('an export imports back to the same config', () => {
		const config = defaultConfig();
		config.features.labels.rules.push({ id: 'abc123', name: 'Index', enabled: true, match: 'all', conditions: [{ type: 'filename', value: 'index', not: false }], effect: { properties: [] } });
		const result = parseImport(exportConfig(config));
		assert.ok(result.ok);
		assert.deepEqual(result.config, config);
		assert.deepEqual(result.warnings, []);
		assert.deepEqual(result.summary, { enabled: true, featuresOn: ['labels'], rules: 1 });
	});

	test('what cannot be imported changes nothing', () => {
		assert.deepEqual(parseImport('  '), { ok: false, error: 'empty' });
		assert.deepEqual(parseImport('{ "features": '), { ok: false, error: 'syntax' });
		assert.deepEqual(parseImport('[1, 2]'), { ok: false, error: 'notConfig' });
		assert.deepEqual(parseImport('{ "title": "x" }'), { ok: false, error: 'notConfig' });
	});

	test('an import with problems still lists them', () => {
		const result = parseImport('{ "version": 1, "features": { "labels": { "enabled": false, "scope": 1 } } }');
		assert.ok(result.ok);
		assert.deepEqual(result.summary.featuresOn, []);
		assert.deepEqual(result.warnings, ['features.labels.scope']);
	});
});

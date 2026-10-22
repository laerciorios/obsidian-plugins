import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { defaultLabels } from '../src/features/labels/config';
import type { LabelsConfig } from '../src/features/labels/config';
import { labelFor, pickLabel, truncate } from '../src/features/labels/pick-label';
import type { NoteFacts } from '../src/rules/types';

function note(path: string, frontmatter: Record<string, unknown> = {}): NoteFacts {
	const parts = path.split('/');
	const file = parts.pop() ?? path;
	return { path, basename: file.replace(/\.md$/, ''), folder: parts.join('/'), tags: [], frontmatter };
}

function labels(extra: Partial<LabelsConfig> = {}): LabelsConfig {
	return { ...defaultLabels(), ...extra };
}

describe('picking the label', () => {
	test('the first property with a value wins, in priority order', () => {
		assert.equal(pickLabel({ title: 'Alpha', aliases: ['A'] }, ['title', 'aliases']), 'Alpha');
		assert.equal(pickLabel({ title: '  ', aliases: ['', 'Beta', 'B'] }, ['title', 'aliases']), 'Beta');
		assert.equal(pickLabel({ aliases: [] }, ['title', 'aliases']), null);
		assert.equal(pickLabel({}, []), null);
	});

	test('keys are found ignoring case', () => {
		assert.equal(pickLabel({ Title: 'Gamma' }, ['title']), 'Gamma');
	});

	test('numbers, booleans and links become text; objects are skipped', () => {
		assert.equal(pickLabel({ n: 42 }, ['n']), '42');
		assert.equal(pickLabel({ b: false }, ['b']), 'false');
		assert.equal(pickLabel({ l: '[[Work/Alpha/index|Alpha project]]' }, ['l']), 'Alpha project');
		assert.equal(pickLabel({ l: '[[Work/Alpha/index]]' }, ['l']), 'index');
		assert.equal(pickLabel({ l: '[[Delta.md#Goals]]' }, ['l']), 'Delta');
		assert.equal(pickLabel({ l: '[Site](https://example.com)' }, ['l']), 'Site');
		assert.equal(pickLabel({ o: { a: 1 }, t: 'ok' }, ['o', 't']), 'ok');
		assert.equal(pickLabel({ x: Number.NaN }, ['x']), null);
	});

	test('line breaks and repeated spaces collapse', () => {
		assert.equal(pickLabel({ title: ' Two\n  lines ' }, ['title']), 'Two lines');
	});

	test('truncation counts characters and ends with an ellipsis', () => {
		assert.equal(truncate('Greenhouse project', 0), 'Greenhouse project');
		assert.equal(truncate('Greenhouse project', 18), 'Greenhouse project');
		assert.equal(truncate('Greenhouse project', 11), 'Greenhouse…');
		assert.equal(truncate('🌻🌻🌻🌻', 3), '🌻🌻…');
	});
});

describe('label of a note', () => {
	const project = note('Projects/Alpha/index.md', { title: 'Alpha', aliases: ['A'] });
	const aliasOnly = note('People/ana.md', { aliases: ['Ana Lima'] });
	const plain = note('Inbox/idea.md');
	const indexRule = { id: 'i', name: '', enabled: true, match: 'all' as const, conditions: [{ type: 'filename' as const, value: 'index', not: false }] };

	test('scope "all" uses the default list for every note', () => {
		assert.equal(labelFor(labels(), project), 'Alpha');
		assert.equal(labelFor(labels(), aliasOnly), null);
		assert.equal(labelFor(labels({ properties: ['title', 'aliases'] }), aliasOnly), 'Ana Lima');
		assert.equal(labelFor(labels(), plain), null);
	});

	test('scope "matching" only labels notes matched by a rule', () => {
		const config = labels({ scope: 'matching', properties: ['title', 'aliases'], rules: [{ ...indexRule, effect: { properties: [] } }] });
		assert.equal(labelFor(config, project), 'Alpha');
		assert.equal(labelFor(config, aliasOnly), null);
	});

	test('a disabled rule is skipped without being removed', () => {
		const config = labels({ scope: 'matching', rules: [{ ...indexRule, enabled: false, effect: { properties: [] } }] });
		assert.equal(labelFor(config, project), null);
	});

	test('rule effects: own property list or the file name', () => {
		assert.equal(labelFor(labels({ rules: [{ ...indexRule, effect: { properties: ['aliases'] } }] }), project), 'A');
		assert.equal(labelFor(labels({ rules: [{ ...indexRule, effect: { native: true } }] }), project), null);
	});

	test('the maximum length applies to the chosen label', () => {
		assert.equal(labelFor(labels({ maxLength: 3 }), project), 'Al…');
	});
});

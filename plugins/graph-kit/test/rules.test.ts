import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { conditionMatches, firstMatch, inFolder, ruleMatches, wildcard } from '../src/rules/evaluate';
import type { Condition, NoteFacts, Rule } from '../src/rules/types';

function note(path: string, frontmatter: Record<string, unknown> = {}, tags: string[] = []): NoteFacts {
	const parts = path.split('/');
	const file = parts.pop() ?? path;
	return { path, basename: file.replace(/\.md$/, ''), folder: parts.join('/'), tags, frontmatter };
}

function rule(conditions: Condition[], extra: Partial<Rule<string>> = {}): Rule<string> {
	return { id: 'r', name: '', enabled: true, match: 'all', conditions, effect: 'x', ...extra };
}

const alpha = note('Work/Acme/Projects/Alpha/index.md', { title: 'Alpha', type: 'project', status: 'paused' }, ['project', 'client/acme']);

describe('conditions', () => {
	test('folder, with and without subfolders', () => {
		assert.ok(conditionMatches({ type: 'folder', path: 'Work/Acme/Projects/Alpha', subfolders: false, not: false }, alpha));
		assert.ok(!conditionMatches({ type: 'folder', path: 'Work', subfolders: false, not: false }, alpha));
		assert.ok(conditionMatches({ type: 'folder', path: 'Work', subfolders: true, not: false }, alpha));
		assert.ok(conditionMatches({ type: 'folder', path: '/Work/', subfolders: true, not: false }, alpha));
		assert.ok(!conditionMatches({ type: 'folder', path: 'Wor', subfolders: true, not: false }, alpha));
	});

	test('the vault root', () => {
		assert.ok(inFolder('', '', false));
		assert.ok(!inFolder('Work', '', false));
		assert.ok(inFolder('Work', '', true));
	});

	test('tag, nested and case-insensitive', () => {
		assert.ok(conditionMatches({ type: 'tag', tag: '#Project', nested: false, not: false }, alpha));
		assert.ok(conditionMatches({ type: 'tag', tag: 'client', nested: true, not: false }, alpha));
		assert.ok(!conditionMatches({ type: 'tag', tag: 'client', nested: false, not: false }, alpha));
		assert.ok(!conditionMatches({ type: 'tag', tag: 'proj', nested: true, not: false }, alpha));
	});

	test('file name with wildcards, ignoring case', () => {
		assert.ok(conditionMatches({ type: 'filename', value: 'INDEX', not: false }, alpha));
		assert.ok(!conditionMatches({ type: 'filename', value: 'ind', not: false }, alpha));
		assert.ok(wildcard('2026-*').test('2026-10-22-meeting'));
		assert.ok(wildcard('a.b (c)').test('A.B (C)'));
		assert.ok(!wildcard('a.b').test('axb'));
	});

	test('property exists ignores empty values', () => {
		const facts = note('n.md', { title: 'X', empty: '', blank: '  ', list: [], nulls: [null, ''], zero: 0, no: false });
		for (const key of ['title', 'zero', 'no', 'TITLE']) assert.ok(conditionMatches({ type: 'propertyExists', key, not: false }, facts), key);
		for (const key of ['empty', 'blank', 'list', 'nulls', 'missing']) assert.ok(!conditionMatches({ type: 'propertyExists', key, not: false }, facts), key);
	});

	test('property equals: text, lists, numbers and links', () => {
		const facts = note('m.md', {
			status: 'Done',
			kind: ['movie', 'series'],
			rating: 4,
			projects: ['[[Work/Acme/Projects/Alpha/index|alpha]]'],
		});
		const equals = (key: string, value: string) => conditionMatches({ type: 'propertyEquals', key, value, not: false }, facts);
		assert.ok(equals('status', 'done'));
		assert.ok(equals('kind', 'series'));
		assert.ok(equals('rating', '4'));
		assert.ok(equals('projects', 'alpha'));
		assert.ok(equals('projects', 'Work/Acme/Projects/Alpha/index'));
		assert.ok(equals('projects', '[[Work/Acme/Projects/Alpha/index]]'));
		assert.ok(!equals('status', 'do'));
		assert.ok(!equals('status', ''));
		assert.ok(!equals('missing', 'done'));
	});

	test('"not" inverts any condition', () => {
		assert.ok(conditionMatches({ type: 'propertyEquals', key: 'status', value: 'done', not: true }, alpha));
		assert.ok(!conditionMatches({ type: 'filename', value: 'index', not: true }, alpha));
	});
});

describe('rules', () => {
	const isIndex: Condition = { type: 'filename', value: 'index', not: false };
	const isDone: Condition = { type: 'propertyEquals', key: 'status', value: 'done', not: false };

	test('all and any', () => {
		assert.ok(!ruleMatches(rule([isIndex, isDone]), alpha));
		assert.ok(ruleMatches(rule([isIndex, isDone], { match: 'any' }), alpha));
	});

	test('a rule without conditions matches every note', () => {
		assert.ok(ruleMatches(rule([]), note('x.md')));
	});

	test('the first enabled matching rule wins', () => {
		const rules = [
			rule([isIndex], { id: 'off', enabled: false }),
			rule([isDone], { id: 'done' }),
			rule([isIndex], { id: 'index' }),
			rule([], { id: 'otherwise' }),
		];
		assert.equal(firstMatch(rules, alpha)?.id, 'index');
		assert.equal(firstMatch(rules, note('free.md'))?.id, 'otherwise');
		assert.equal(firstMatch([], alpha), null);
	});
});

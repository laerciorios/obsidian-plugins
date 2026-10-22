import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { colorCss, parseChannels, parseHex, readColor } from '../src/colors';
import { Reader } from '../src/config/reader';
import { kindsByTarget, typeForKinds, typeForLink } from '../src/features/link-types/classify';
import { bodyType, defaultLinkTypes, readLinkTypes } from '../src/features/link-types/config';
import type { LinkType } from '../src/features/link-types/config';

function property(key: string, id = key): LinkType {
	return { id, source: { kind: 'property', key }, color: null, style: 'solid', visible: true };
}

describe('grouping a note\'s links by target', () => {
	test('frontmatter keys lose their index; body links and embeds are "body"', () => {
		const kinds = kindsByTarget({
			frontmatter: [
				{ key: 'projects.0', target: 'Projects/Alpha/index.md' },
				{ key: 'Attendees.1', target: 'People/ana.md' },
				{ key: 'parent', target: 'Projects/Alpha/index.md' },
			],
			body: ['People/ana.md', 'Ghost note'],
		});
		assert.deepEqual([...(kinds.get('Projects/Alpha/index.md')?.properties ?? [])].sort(), ['parent', 'projects']);
		assert.equal(kinds.get('Projects/Alpha/index.md')?.body, false);
		assert.deepEqual([...(kinds.get('People/ana.md')?.properties ?? [])], ['attendees']);
		assert.equal(kinds.get('People/ana.md')?.body, true);
		assert.equal(kinds.get('Ghost note')?.body, true);
	});
});

describe('type of a link', () => {
	const types = [property('parent'), property('projects'), bodyType()];
	const kinds = (body: boolean, ...properties: string[]) => ({ body, properties: new Set(properties) });

	test('the first type in priority order wins', () => {
		assert.equal(typeForKinds(kinds(true, 'projects', 'parent'), types)?.id, 'parent');
		assert.equal(typeForKinds(kinds(true), types)?.id, 'body');
		assert.equal(typeForKinds(kinds(false, 'reference'), types), null);
		assert.equal(typeForKinds(undefined, types), null);
	});

	test('property keys match ignoring case', () => {
		assert.equal(typeForKinds(kinds(false, 'projects'), [property('Projects')])?.id, 'Projects');
	});

	test('mutual links: a property on either side beats the body', () => {
		assert.equal(typeForLink(kinds(true), kinds(false, 'projects'), types)?.id, 'projects');
		assert.equal(typeForLink(kinds(false, 'parent'), kinds(false, 'projects'), types)?.id, 'parent');
		assert.equal(typeForLink(undefined, kinds(true), types)?.id, 'body');
		assert.equal(typeForLink(kinds(true), undefined, types)?.id, 'body');
	});
});

describe('colors', () => {
	test('hex and theme channels', () => {
		assert.equal(parseHex('#e93147'), 0xe93147);
		assert.equal(parseHex('abc'), 0xaabbcc);
		assert.equal(parseHex('#12345'), null);
		assert.equal(parseChannels('233, 49, 71'), 0xe93147);
		assert.equal(parseChannels(''), null);
		assert.equal(parseChannels('1, 2, 300'), null);
		assert.equal(colorCss({ kind: 'preset', value: 'blue' }), 'rgb(var(--color-blue-rgb))');
	});

	test('reading a saved color', () => {
		assert.deepEqual(readColor({ kind: 'preset', value: 'green' }), { kind: 'preset', value: 'green' });
		assert.deepEqual(readColor({ kind: 'hex', value: ' #fff ' }), { kind: 'hex', value: '#fff' });
		assert.equal(readColor({ kind: 'preset', value: 'magenta' }), null);
		assert.equal(readColor({ kind: 'hex', value: 'nope' }), null);
	});
});

describe('link types config', () => {
	test('defaults: off, the body type, legend at the bottom left', () => {
		const config = defaultLinkTypes();
		assert.equal(config.enabled, false);
		assert.deepEqual(config.types, [bodyType()]);
		assert.deepEqual(config.legend, { show: true, position: 'bottom-left' });
	});

	test('broken types are dropped with a warning, the rest kept in order', () => {
		const reader = new Reader();
		const config = readLinkTypes(
			{
				types: [
					{ id: 'p', source: { kind: 'property', key: ' projects ' }, color: { kind: 'preset', value: 'blue' }, style: 'dashed', visible: false },
					{ id: 'x', source: { kind: 'tag' } },
					{ id: 'p', source: { kind: 'body' } },
					{ id: 'b', source: { kind: 'body' }, color: { kind: 'hex', value: 'nope' }, style: 'wavy' },
				],
				hidden: { global: ['p'], local: 'x' },
			},
			reader,
			'features.link-types',
		);
		assert.deepEqual(config.types, [
			{ id: 'p', source: { kind: 'property', key: 'projects' }, color: { kind: 'preset', value: 'blue' }, style: 'dashed', visible: false },
			{ id: 'b', source: { kind: 'body' }, color: null, style: 'solid', visible: true },
		]);
		assert.deepEqual(config.hidden, { global: ['p'], local: [] });
		assert.deepEqual(reader.warnings, ['features.link-types.types[1]', 'features.link-types.types[2]', 'features.link-types.hidden.local']);
	});
});

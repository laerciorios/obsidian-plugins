import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Reader } from '../src/config/reader';
import { defaultIcons, readIcons } from '../src/features/icons/config';
import type { IconsConfig } from '../src/features/icons/config';
import { folderSymbol, graphemes, iconFor, iconFromValue, readFolderStyleSymbols } from '../src/features/icons/resolve';
import type { NoteFacts } from '../src/rules/types';

const lucide = (id: string) => ['book-open', 'sprout', 'users'].includes(id);

function note(path: string, frontmatter: Record<string, unknown> = {}): NoteFacts {
	const parts = path.split('/');
	const file = parts.pop() ?? path;
	return { path, basename: file.replace(/\.md$/, ''), folder: parts.join('/'), tags: [], frontmatter };
}

describe('icon values', () => {
	test('Lucide ids, with or without the prefix', () => {
		assert.deepEqual(iconFromValue('book-open', lucide), { kind: 'lucide', value: 'book-open' });
		assert.deepEqual(iconFromValue('lucide-sprout', lucide), { kind: 'lucide', value: 'sprout' });
		assert.deepEqual(iconFromValue('Lucide:Users', lucide), { kind: 'lucide', value: 'users' });
	});

	test('emoji and up to three characters; longer text is not an icon', () => {
		assert.deepEqual(iconFromValue('🌻', lucide), { kind: 'text', value: '🌻' });
		assert.deepEqual(iconFromValue('👩🏽‍🌾', lucide), { kind: 'text', value: '👩🏽‍🌾' });
		assert.deepEqual(iconFromValue(' §§ ', lucide), { kind: 'text', value: '§§' });
		assert.equal(iconFromValue('project', lucide), null);
		assert.equal(iconFromValue('', lucide), null);
		assert.equal(iconFromValue(42, lucide), null);
	});

	test('a list gives its first icon', () => {
		assert.deepEqual(iconFromValue(['long text', 'sprout'], lucide), { kind: 'lucide', value: 'sprout' });
	});

	test('characters are counted as people see them', () => {
		assert.equal(graphemes('👩🏽‍🌾'), 1);
		assert.equal(graphemes('abc'), 3);
	});
});

describe('Folder Style symbols', () => {
	const data = {
		version: 1,
		folders: {
			Work: { symbol: { kind: 'text', value: '💼' }, color: { kind: 'preset', value: 'blue' } },
			'Work/Acme': { color: { kind: 'preset', value: 'red' } },
			Study: { symbol: { kind: 'lucide', value: 'book-open' } },
			Broken: { symbol: { kind: 'emoji', value: 'x' } },
		},
	};

	test('symbols by folder; other formats are not recognized', () => {
		assert.deepEqual(readFolderStyleSymbols(data), { Work: { kind: 'text', value: '💼' }, Study: { kind: 'lucide', value: 'book-open' } });
		assert.equal(readFolderStyleSymbols({ version: 1 }), null);
		assert.equal(readFolderStyleSymbols('x'), null);
	});

	test('the nearest folder with a symbol wins', () => {
		const symbols = readFolderStyleSymbols(data) ?? {};
		assert.deepEqual(folderSymbol('Work/Acme/Projects', symbols), { kind: 'text', value: '💼' });
		assert.equal(folderSymbol('Inbox', symbols), null);
		assert.equal(folderSymbol('', symbols), null);
	});
});

describe('icon of a note', () => {
	const config = (extra: Partial<IconsConfig> = {}): IconsConfig => ({ ...defaultIcons(), ...extra });
	const person = { id: 'p', name: '', enabled: true, match: 'all' as const, conditions: [{ type: 'propertyEquals' as const, key: 'type', value: 'person', not: false }] };
	const symbols = { Work: { kind: 'text' as const, value: '💼' } };

	test('rule, then the icon property, then the folder symbol (when on)', () => {
		const ana = note('Work/People/ana.md', { type: 'person', icon: '🌻', emoji: '🙂' });
		assert.deepEqual(iconFor(config({ rules: [{ ...person, effect: { icon: { kind: 'lucide', value: 'users' } } }] }), ana, lucide, symbols), { kind: 'lucide', value: 'users' });
		assert.deepEqual(iconFor(config({ rules: [{ ...person, effect: { property: 'emoji' } }] }), ana, lucide, symbols), { kind: 'text', value: '🙂' });
		assert.equal(iconFor(config({ rules: [{ ...person, effect: { none: true } }] }), ana, lucide, symbols), null);
		assert.deepEqual(iconFor(config(), ana, lucide, symbols), { kind: 'text', value: '🌻' });
		const plain = note('Work/notes.md');
		assert.equal(iconFor(config(), plain, lucide, symbols), null);
		assert.deepEqual(iconFor(config({ useFolderStyle: true }), plain, lucide, symbols), { kind: 'text', value: '💼' });
	});

	test('reading icon rules', () => {
		let next = 0;
		const reader = new Reader(() => `r${++next}`);
		const read = readIcons({ property: '  ', rules: [{ effect: { icon: { kind: 'lucide', value: 'sprout' } } }, { effect: { property: 'emoji' } }, { effect: { icon: { kind: 'svg', value: 'x' } } }] }, reader, 'features.icons');
		assert.equal(read.property, 'icon');
		assert.deepEqual(read.rules.map((rule) => rule.effect), [{ icon: { kind: 'lucide', value: 'sprout' } }, { property: 'emoji' }]);
		assert.deepEqual(reader.warnings, ['features.icons.property', 'features.icons.rules[2].effect']);
	});
});

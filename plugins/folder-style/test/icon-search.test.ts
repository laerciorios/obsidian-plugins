import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { searchIcons } from '../src/ui/icon-search';

const IDS = [
	'lucide-book-open',
	'lucide-notebook',
	'lucide-book',
	'lucide-bookmark',
	'lucide-folder',
	'lucide-folder-heart',
	'lucide-file-text',
	'obsidian-book', // not Lucide: an Obsidian or plugin icon
	'book-ghost',
];

describe('icon search', () => {
	test('"book" lists the Lucide icons with it, without the lucide- prefix, starting with it first', () => {
		assert.deepEqual(searchIcons(IDS, 'book', 50), ['book', 'book-open', 'bookmark', 'notebook']);
	});

	test('case and spaces do not matter', () => {
		assert.deepEqual(searchIcons(IDS, '  Folder Heart ', 50), ['folder-heart']);
	});

	test('an empty query lists every Lucide icon, sorted', () => {
		assert.deepEqual(searchIcons(IDS, '', 50), ['book', 'book-open', 'bookmark', 'file-text', 'folder', 'folder-heart', 'notebook']);
	});

	test('at most `limit` results', () => {
		assert.deepEqual(searchIcons(IDS, '', 3), ['book', 'book-open', 'bookmark']);
	});

	test('no match gives an empty list', () => {
		assert.deepEqual(searchIcons(IDS, 'zebra', 50), []);
	});
});

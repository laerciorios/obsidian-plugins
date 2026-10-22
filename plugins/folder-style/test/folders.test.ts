import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { foldersAfterDelete, foldersAfterRename } from '../src/folders';
import type { FolderStyle } from '../src/types';

const star: FolderStyle = { symbol: { kind: 'text', value: '★' } };
const blue: FolderStyle = { color: { kind: 'preset', value: 'blue' } };
const red: FolderStyle = { color: { kind: 'preset', value: 'red' } };

describe('renaming or moving a folder', () => {
	test('the folder keeps its style under the new path', () => {
		assert.deepEqual(foldersAfterRename({ Reading: star, Work: blue }, 'Reading', 'Books'), { Books: star, Work: blue });
	});

	test('subfolders at every level move along', () => {
		const folders = { 'Area/Notes': star, 'Area/Notes/2026': blue, 'Area/Notes/2026/Q1': red, 'Area/Other': blue };
		assert.deepEqual(foldersAfterRename(folders, 'Area/Notes', 'Archive/Notes'), {
			'Archive/Notes': star,
			'Archive/Notes/2026': blue,
			'Archive/Notes/2026/Q1': red,
			'Area/Other': blue,
		});
	});

	test('subfolders move even when the folder itself has no style', () => {
		assert.deepEqual(foldersAfterRename({ 'Area/Notes': star }, 'Area', 'Knowledge'), { 'Knowledge/Notes': star });
	});

	test('a sibling that only shares the name prefix stays', () => {
		const folders = { Notes: star, 'Notes archive': blue, 'Notes archive/2026': red };
		assert.deepEqual(foldersAfterRename(folders, 'Notes', 'Journal'), { Journal: star, 'Notes archive': blue, 'Notes archive/2026': red });
	});

	test('onto a path left with an old style, the moved style wins and the old entries under it go', () => {
		const folders = { Notes: star, 'Notes/2026': blue, Journal: red, 'Journal/Old': red, 'Journal archive': red };
		assert.deepEqual(foldersAfterRename(folders, 'Notes', 'Journal'), { Journal: star, 'Journal/2026': blue, 'Journal archive': red });
	});

	test('nothing to move gives null, so nothing is saved', () => {
		assert.equal(foldersAfterRename({ Work: blue }, 'Reading', 'Books'), null);
	});
});

describe('deleting a folder', () => {
	test('the folder and everything under it are removed', () => {
		const folders = { Area: star, 'Area/Notes': blue, 'Area/Notes/2026': red, 'Area archive': blue, Work: red };
		assert.deepEqual(foldersAfterDelete(folders, 'Area'), { 'Area archive': blue, Work: red });
	});

	test('nothing to remove gives null', () => {
		assert.equal(foldersAfterDelete({ Work: red }, 'Reading'), null);
	});
});

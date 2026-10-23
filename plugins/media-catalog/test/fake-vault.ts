import { TFile, TFolder } from 'obsidian';
import type { App } from 'obsidian';

/** A note of a fake vault: its path and frontmatter (null: a note without one). */
export interface FakeNote {
	path: string;
	frontmatter: Record<string, unknown> | null;
}

export interface FakeVault {
	app: App;
	file: (path: string) => TFile;
}

/**
 * Just what the folder, name and duplicate lookups read: a folder tree with
 * the notes (and any empty `folders`), the file list and the metadata cache.
 */
export function fakeVault(notes: FakeNote[], folders: string[] = []): FakeVault {
	const root = Object.assign(new TFolder(), { path: '/', name: '', children: [], parent: null });
	const byPath = new Map<string, TFolder | TFile>();
	const frontmatter = new Map<TFile, Record<string, unknown> | null>();

	const folderOf = (path: string): TFolder => {
		if (path === '' || path === '/') return root;
		const known = byPath.get(path);
		if (known instanceof TFolder) return known;
		const slash = path.lastIndexOf('/');
		const parent = folderOf(slash > 0 ? path.slice(0, slash) : '/');
		const folder = Object.assign(new TFolder(), { path, name: path.slice(slash + 1), children: [], parent });
		parent.children.push(folder);
		byPath.set(path, folder);
		return folder;
	};

	for (const path of folders) folderOf(path);
	for (const note of notes) {
		const slash = note.path.lastIndexOf('/');
		const parent = folderOf(slash > 0 ? note.path.slice(0, slash) : '/');
		const name = note.path.slice(slash + 1);
		const file = Object.assign(new TFile(), {
			path: note.path,
			name,
			basename: name.replace(/\.md$/, ''),
			extension: 'md',
			parent,
		});
		parent.children.push(file);
		byPath.set(note.path, file);
		frontmatter.set(file, note.frontmatter);
	}

	const app = {
		vault: {
			getRoot: () => root,
			getFolderByPath: (path: string) => {
				const found = path === '/' ? root : byPath.get(path);
				return found instanceof TFolder ? found : null;
			},
			getFileByPath: (path: string) => {
				const found = byPath.get(path);
				return found instanceof TFile ? found : null;
			},
			getAbstractFileByPath: (path: string) => byPath.get(path) ?? null,
			getMarkdownFiles: () => [...frontmatter.keys()],
		},
		metadataCache: {
			getFileCache: (file: TFile) => ({ frontmatter: frontmatter.get(file) ?? undefined }),
		},
	};
	return {
		app: app as unknown as App,
		file: (path) => {
			const found = byPath.get(path);
			if (!(found instanceof TFile)) throw new Error(`no note at ${path}`);
			return found;
		},
	};
}

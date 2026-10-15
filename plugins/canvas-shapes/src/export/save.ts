import { FileSystemAdapter, Platform, TFolder, normalizePath } from 'obsidian';
import type { App, TFile } from 'obsidian';

/**
 * Where exports are written. On desktop, the system's save window (Electron) and Node's file
 * system, loaded only there; elsewhere (mobile) a folder of the vault. The canvas file itself is
 * never written.
 */

interface ElectronDialog {
	showSaveDialog(options: Record<string, unknown>): Promise<{ canceled: boolean; filePath?: string }>;
	showOpenDialog(options: Record<string, unknown>): Promise<{ canceled: boolean; filePaths: string[] }>;
}

interface NodeFs {
	promises: {
		writeFile(path: string, data: Uint8Array | string): Promise<void>;
		mkdir(path: string, options: { recursive: boolean }): Promise<unknown>;
	};
}

interface NodePath {
	join(...parts: string[]): string;
	dirname(path: string): string;
}

interface Desktop {
	dialog: ElectronDialog;
	fs: NodeFs;
	path: NodePath;
}

/** Electron's dialog and Node's fs, or null on mobile or if the app stops exposing them. */
function desktop(): Desktop | null {
	if (!Platform.isDesktopApp) return null;
	try {
		const load = (window as unknown as { require?: (id: string) => unknown }).require;
		if (!load) return null;
		const electron = load('electron') as { remote?: { dialog?: ElectronDialog } };
		const dialog = electron.remote?.dialog;
		if (!dialog) return null;
		return { dialog, fs: load('fs') as NodeFs, path: load('path') as NodePath };
	} catch {
		return null;
	}
}

export type Bytes = ArrayBuffer | string;

const toWrite = (data: Bytes): Uint8Array | string => (typeof data === 'string' ? data : new Uint8Array(data));

/** Absolute folder of the canvas on disk (desktop), to open the save window there. */
function diskFolder(app: App, canvas: TFile, path: NodePath): string | null {
	const adapter = app.vault.adapter;
	if (!(adapter instanceof FileSystemAdapter)) return null;
	return path.join(adapter.getBasePath(), canvas.parent?.path ?? '');
}

async function ensureVaultFolder(app: App, folder: string): Promise<void> {
	if (!folder || app.vault.getAbstractFileByPath(folder) instanceof TFolder) return;
	await app.vault.createFolder(folder);
}

/** Vault folder for exports: the setting, or the canvas's own folder. */
function vaultExportFolder(canvas: TFile, setting: string): string {
	return normalizePath(setting || canvas.parent?.path || '/');
}

export interface Saved {
	/** Where it went, for the notice. */
	location: string;
}

/** Save one file: system save window on desktop, vault folder elsewhere. Null when cancelled. */
export async function saveFile(app: App, canvas: TFile, exportFolder: string, name: string, extension: string, data: Bytes): Promise<Saved | null> {
	const system = desktop();
	if (system) {
		const folder = diskFolder(app, canvas, system.path);
		const result = await system.dialog.showSaveDialog({
			defaultPath: folder ? system.path.join(folder, `${name}.${extension}`) : `${name}.${extension}`,
			filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
			properties: ['showOverwriteConfirmation', 'createDirectory'],
		});
		if (result.canceled || !result.filePath) return null;
		await system.fs.promises.writeFile(result.filePath, toWrite(data));
		return { location: result.filePath };
	}
	const folder = vaultExportFolder(canvas, exportFolder);
	await ensureVaultFolder(app, folder === '/' ? '' : folder);
	const base = folder === '/' ? name : `${folder}/${name}`;
	let path = `${base}.${extension}`;
	for (let n = 1; app.vault.getAbstractFileByPath(path); n++) path = `${base} ${n}.${extension}`;
	if (typeof data === 'string') await app.vault.create(path, data);
	else await app.vault.createBinary(path, data);
	return { location: path };
}

/** A folder being filled by an export. */
export interface FolderTarget {
	location: string;
	write(relative: string, data: Bytes): Promise<void>;
}

/**
 * Pick where a folder export goes: on desktop the user picks a parent folder and the export
 * gets a subfolder `name`; elsewhere a new vault folder. Null when cancelled.
 */
export async function chooseFolder(app: App, canvas: TFile, exportFolder: string, name: string): Promise<FolderTarget | null> {
	const system = desktop();
	if (system) {
		const result = await system.dialog.showOpenDialog({
			defaultPath: diskFolder(app, canvas, system.path) ?? undefined,
			properties: ['openDirectory', 'createDirectory'],
		});
		const parent = result.filePaths[0];
		if (result.canceled || !parent) return null;
		return diskTarget(system, system.path.join(parent, name));
	}
	const folder = vaultExportFolder(canvas, exportFolder);
	let target = folder === '/' ? name : `${folder}/${name}`;
	for (let n = 2; app.vault.getAbstractFileByPath(target); n++) target = `${folder === '/' ? '' : `${folder}/`}${name} ${n}`;
	return vaultTarget(app, target);
}

/** A folder on disk (desktop); also used directly by tests in the app. */
export function diskTarget(system: Desktop | null, root: string): FolderTarget | null {
	const desk = system ?? desktop();
	if (!desk) return null;
	return {
		location: root,
		write: async (relative, data) => {
			const full = desk.path.join(root, ...relative.split('/'));
			await desk.fs.promises.mkdir(desk.path.dirname(full), { recursive: true });
			await desk.fs.promises.writeFile(full, toWrite(data));
		},
	};
}

function vaultTarget(app: App, root: string): FolderTarget {
	return {
		location: root,
		write: async (relative, data) => {
			const full = normalizePath(`${root}/${relative}`);
			const parent = full.split('/').slice(0, -1).join('/');
			for (let i = 1, parts = parent.split('/'); i <= parts.length; i++) await ensureVaultFolder(app, parts.slice(0, i).join('/'));
			if (typeof data === 'string') await app.vault.create(full, data);
			else await app.vault.createBinary(full, data);
		},
	};
}

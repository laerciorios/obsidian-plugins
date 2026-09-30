import { TFolder, getAllTags } from 'obsidian';
import type { App, TFile } from 'obsidian';
import { INDEX_BASENAME, NOTE_EXTENSIONS, README_BASENAME } from '../constants';
import { isKebabCase, isTitleCase, kebabCase, titleCase } from '../naming/case';
import { RULE_IDS } from '../types';
import type { Finding, ScanResult, VaultRules } from '../types';
import { hasIndex, hasReadme } from './files';
import { containsFolder, isIgnored, isVocabulary, joinPath, ownerFolder, parentPath } from './paths';

/**
 * Free paths for suggestions: case-insensitive, and every suggestion of the
 * scan is reserved, so two notes never get the same target.
 */
class PathPool {
	private readonly taken: Set<string>;

	constructor(app: App) {
		this.taken = new Set(app.vault.getAllLoadedFiles().map((file) => file.path.toLowerCase()));
	}

	/** `<folder>/<base>.<ext>`, or `-2`, `-3`… when taken. `self` may keep its own path (a change of case). */
	claim(folder: string, base: string, extension: string, self?: string): string {
		const pathFor = (suffix: string) => joinPath(folder, `${base}${suffix}.${extension}`);
		let path = pathFor('');
		for (let index = 2; this.isTaken(path, self); index++) path = pathFor(`-${index}`);
		this.taken.add(path.toLowerCase());
		return path;
	}

	private isTaken(path: string, self?: string): boolean {
		const key = path.toLowerCase();
		return this.taken.has(key) && key !== self?.toLowerCase();
	}
}

function hasTag(app: App, file: TFile, tag: string): boolean {
	const cache = app.metadataCache.getFileCache(file);
	const wanted = tag.toLowerCase();
	return (getAllTags(cache ?? {}) ?? []).some((raw) => {
		const found = raw.replace(/^#/, '').toLowerCase();
		return found === wanted || found.startsWith(`${wanted}/`);
	});
}

/** Areas and topics: folders up to `indexDepth` levels below each root, outside vocabulary folders. */
function missingIndexes(app: App, rules: VaultRules, pool: PathPool): Finding[] {
	const findings: Finding[] = [];
	const seen = new Set<string>();
	const walk = (folder: TFolder, level: number) => {
		if (level >= rules.indexDepth) return;
		for (const child of folder.children) {
			if (!(child instanceof TFolder) || isVocabulary(child.name, rules.vocabulary)) continue;
			if (isIgnored(child.path, rules.ignore) || seen.has(child.path)) continue;
			seen.add(child.path);
			// A README.md is reported (and fixed) as such.
			if (!hasIndex(child) && !hasReadme(child)) {
				const to = pool.claim(child.path, INDEX_BASENAME, 'md');
				findings.push({ rule: 'missing-index', path: child.path, fix: { kind: 'create-index', to } });
			}
			walk(child, level + 1);
		}
	};
	for (const root of rules.indexRoots) {
		const folder = app.vault.getFolderByPath(root);
		if (folder && !isIgnored(root, rules.ignore)) walk(folder, 0);
	}
	return findings;
}

function readme(app: App, file: TFile, pool: PathPool): Finding {
	const folder = file.parent ?? app.vault.getRoot();
	if (hasIndex(folder)) return { rule: 'readme', path: file.path, fix: null, reason: 'index-exists' };
	const to = pool.claim(parentPath(file.path), INDEX_BASENAME, 'md');
	return { rule: 'readme', path: file.path, fix: { kind: 'move', to } };
}

function fileCase(file: TFile, pool: PathPool): Finding {
	const base = kebabCase(file.basename);
	if (!base) return { rule: 'file-case', path: file.path, fix: null, reason: 'no-name' };
	const to = pool.claim(parentPath(file.path), base, file.extension, file.path);
	return { rule: 'file-case', path: file.path, fix: { kind: 'move', to } };
}

function aiOutside(file: TFile, rules: VaultRules, pool: PathPool): Finding {
	const owner = ownerFolder(parentPath(file.path), rules.vocabulary);
	if (!owner) return { rule: 'ai-outside', path: file.path, fix: null, reason: 'root' };
	const to = pool.claim(joinPath(owner, rules.aiFolder), file.basename, file.extension);
	return { rule: 'ai-outside', path: file.path, fix: { kind: 'move', to } };
}

/** Everything in the vault that breaks the rules, grouped by rule and sorted by path. Changes nothing. */
export function scan(app: App, rules: VaultRules): ScanResult {
	const pool = new PathPool(app);
	const minorWords = new Set(rules.minorWords);
	const checkAi = rules.aiTag !== '' && rules.aiFolder !== '';
	const findings: Finding[] = missingIndexes(app, rules, pool);
	let notes = 0;
	let folders = 0;

	const files = app.vault
		.getFiles()
		.filter((file) => NOTE_EXTENSIONS.has(file.extension) && !isIgnored(file.path, rules.ignore));
	for (const file of files) {
		notes++;
		const isReadme = file.extension === 'md' && file.basename.toLowerCase() === README_BASENAME;
		if (isReadme) findings.push(readme(app, file, pool));
		else if (!isKebabCase(file.basename)) findings.push(fileCase(file, pool));
		const misplaced = checkAi && file.extension === 'md' && !containsFolder(parentPath(file.path), rules.aiFolder);
		if (misplaced && hasTag(app, file, rules.aiTag)) findings.push(aiOutside(file, rules, pool));
	}

	for (const folder of app.vault.getAllFolders(false)) {
		if (isIgnored(folder.path, rules.ignore)) continue;
		folders++;
		if (isTitleCase(folder.name, minorWords)) continue;
		const suggestion = titleCase(folder.name, minorWords);
		findings.push(
			suggestion && suggestion !== folder.name
				? { rule: 'folder-case', path: folder.path, fix: { kind: 'rename-folder', suggestion } }
				: { rule: 'folder-case', path: folder.path, fix: null, reason: 'no-name' },
		);
	}

	const order = (finding: Finding) => RULE_IDS.indexOf(finding.rule);
	findings.sort((a, b) => order(a) - order(b) || a.path.localeCompare(b.path));
	return { findings, folders, notes };
}

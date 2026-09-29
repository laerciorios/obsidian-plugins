import { Notice, TFolder } from 'obsidian';
import type { App } from 'obsidian';
import {
	READING_ALIAS,
	REFERENCE_ALIAS,
	REFERENCE_BOOKS_PATH,
	REFERENCE_READING_LABEL,
	REFERENCE_SECTIONS,
	REFERENCE_TAGS,
} from '../constants';
import { t } from '../i18n';
import type { CatalogDraft } from '../types';
import { joinPath, linkPath, parentPath } from './paths';
import { renderFrontmatterBlock, yaml } from './yaml';

/** Vault paths of folders that contain `_References/Books`, sorted. */
export function listAreas(app: App): string[] {
	return app.vault
		.getAllFolders()
		.filter((folder) => app.vault.getFolderByPath(joinPath(folder.path, REFERENCE_BOOKS_PATH)) instanceof TFolder)
		.map((folder) => folder.path)
		.sort((a, b) => a.localeCompare(b));
}

/** `<area>/_References/Books/<slug>.md` */
export function referencePath(area: string, slug: string): string {
	return joinPath(joinPath(area, REFERENCE_BOOKS_PATH), `${slug}.md`);
}

function escapeLinkText(text: string): string {
	return text.replace(/[[\]]/g, (char) => `\\${char}`);
}

/** Content of a new reference note. Data, not UI: it is never translated. */
export function referenceContent(draft: CatalogDraft, catalogNotePath: string): string {
	const title = draft.title.trim();
	const author = draft.author.trim();
	const url = draft.source.url?.trim() ?? '';
	const frontmatter = renderFrontmatterBlock([
		['title', yaml.quoted(title)],
		['author', yaml.quoted(author)],
		['year', yaml.number(draft.year)],
		['done', yaml.boolean(false)],
		['source_url', yaml.quoted(url)],
		['tags', yaml.list(REFERENCE_TAGS)],
	]);
	const name = url ? `[${escapeLinkText(title)}](${url})` : title;
	const heading = author ? `${name} — ${author}` : name;
	const reading = `${REFERENCE_READING_LABEL}: [[${linkPath(catalogNotePath)}|${READING_ALIAS}]]`;
	return `${frontmatter}${heading}\n\n${reading}\n\n${REFERENCE_SECTIONS.join('\n\n\n')}\n`;
}

/** The catalog note's `reference` value: `[[<area>/_References/Books/<slug>|referência]]`. */
export function referenceLink(area: string, slug: string): string {
	return `[[${linkPath(referencePath(area, slug))}|${REFERENCE_ALIAS}]]`;
}

/**
 * Creates `<area>/_References/Books/<slug>.md` unless it already exists (then
 * it is linked as is and never touched). Throws when the note cannot be created.
 */
export async function ensureReferenceNote(
	app: App,
	draft: CatalogDraft,
	area: string,
	slug: string,
	catalogNotePath: string,
): Promise<void> {
	const path = referencePath(area, slug);
	if (app.vault.getAbstractFileByPath(path)) {
		new Notice(t('notice.referenceExists', { name: slug }));
		return;
	}
	const folder = parentPath(path);
	if (!app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder);
	await app.vault.create(path, referenceContent(draft, catalogNotePath));
	new Notice(t('notice.referenceCreated', { name: slug }));
}

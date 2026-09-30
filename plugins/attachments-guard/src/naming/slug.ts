/**
 * File-name slug, as the vault names its files: lowercase, accents removed,
 * every run of other characters turned into "-", no "-" at the ends.
 * "Relatório Trimestral" → "relatorio-trimestral". Letters of other scripts are kept.
 */
export function slugify(text: string): string {
	return text
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}

/** "a/b/c.md" → "c"; "c" → "c". */
export function basenameOf(path: string): string {
	const name = path.slice(path.lastIndexOf('/') + 1);
	const dot = name.lastIndexOf('.');
	return dot > 0 ? name.slice(0, dot) : name;
}

/** "a/b/c.md" → "b"; "c.md" → "". */
export function parentName(path: string): string {
	const parent = path.slice(0, Math.max(path.lastIndexOf('/'), 0));
	return parent.slice(parent.lastIndexOf('/') + 1);
}

/**
 * Slug of the note an attachment belongs to. Folder summaries are all called
 * `index.md`, so they are named after their folder instead
 * ("Projects/Acme Portal/index.md" → "acme-portal"). Empty when nothing usable is left.
 */
export function noteSlug(notePath: string): string {
	const basename = basenameOf(notePath);
	if (basename.toLowerCase() === 'index') {
		const folder = slugify(parentName(notePath));
		if (folder) return folder;
	}
	return slugify(basename);
}

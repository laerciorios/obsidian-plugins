import { Notice } from 'obsidian';
import type { App } from 'obsidian';
import { updateAliases } from '../catalog/updates';
import { t } from '../i18n';
import { providersFor } from '../providers';
import { canLocalize } from '../providers/localized-title';
import type { CatalogContext, CatalogNoteInfo } from '../types';
import { CatalogModal } from './catalog-modal';

/** Without a title to look up: the title first, every other alias kept. */
async function titleOnly(app: App, note: CatalogNoteInfo): Promise<void> {
	try {
		const changed = await updateAliases(app, note.file, note.kind, null);
		new Notice(t(changed ? 'notice.aliasesUpdated' : 'notice.aliasesUnchanged', { name: note.title }));
	} catch (error) {
		console.error('Media Catalog: could not update the aliases', error);
		new Notice(t('notice.aliasesFailed', { name: note.title }));
	}
}

/**
 * "Update aliases of the current note". Movies, series and games with a
 * country set search the work again (the modal in aliases mode) for its title
 * in that country. Books, albums, or no country: the aliases are put in line
 * with the title at once.
 */
export function updateNoteAliases(context: CatalogContext, note: CatalogNoteInfo): void {
	const country = context.settings.aliasCountry;
	const sources = providersFor(context.providers, note.kind);
	if (country !== '' && sources.some((provider) => canLocalize(provider, note.kind, country))) {
		new CatalogModal(context, { mode: 'aliases', note, country }).open();
		return;
	}
	void titleOnly(context.app, note);
}

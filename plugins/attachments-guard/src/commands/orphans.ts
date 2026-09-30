import { Notice } from 'obsidian';
import type { App, TFile } from 'obsidian';
import { NOTE_EXTENSIONS } from '../constants';
import type { GuardHost } from '../host';
import { t } from '../i18n';
import { OrphansModal } from '../ui/orphans-modal';
import { logError, moveToTrash } from '../vault/files';
import type { Rules } from '../vault/rules';

const yieldToUi = (): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, 0));
/** Read this many notes between yields to the UI. */
const READ_BATCH = 50;

/** Ways a note can spell a file name: as is, and URL-encoded in markdown links (`Captura%20de%20Tela.png`). */
function spellings(file: TFile): string[] {
	const name = file.name.toLowerCase();
	return [...new Set([name, encodeURI(name).toLowerCase(), name.replace(/ /g, '%20')])];
}

/**
 * Attachments nothing points to. A file is in use when a note links to it
 * (body, embeds or frontmatter, from the metadata cache) or when its name
 * appears in the text of any note, canvas or base: canvas nodes, plain
 * frontmatter values, `<img src>` and code all count. Being conservative is
 * the point: a false orphan could end up in the trash.
 */
export async function findOrphans(app: App, rules: Rules): Promise<TFile[]> {
	const candidates = new Map(rules.attachments().map((file) => [file.path, file]));
	for (const targets of Object.values(app.metadataCache.resolvedLinks)) {
		for (const path of Object.keys(targets)) candidates.delete(path);
	}
	const sources = app.vault.getFiles().filter((file) => NOTE_EXTENSIONS.has(file.extension.toLowerCase()));
	for (const [index, source] of sources.entries()) {
		if (candidates.size === 0) break;
		const text = (await app.vault.cachedRead(source)).toLowerCase();
		for (const [path, file] of candidates) {
			if (spellings(file).some((spelling) => text.includes(spelling))) candidates.delete(path);
		}
		if (index % READ_BATCH === READ_BATCH - 1) await yieldToUi();
	}
	return [...candidates.values()].sort((a, b) => a.path.localeCompare(b.path));
}

/** "List orphan attachments": find them, let the user pick, move the picked ones to `.trash/`. */
export class ListOrphans {
	private running = false;

	constructor(private readonly host: GuardHost) {}

	async run(): Promise<void> {
		if (this.running) {
			new Notice(t('notice.orphans.running'));
			return;
		}
		this.running = true;
		try {
			await this.execute();
		} finally {
			this.running = false;
		}
	}

	private async execute(): Promise<void> {
		const { app, rules } = this.host;
		const notice = new Notice(t('notice.orphans.scanning'), 0);
		let orphans: TFile[];
		try {
			orphans = await findOrphans(app, rules);
		} finally {
			notice.hide();
		}
		if (orphans.length === 0) {
			new Notice(t('notice.orphans.none'));
			return;
		}
		const picked = await new OrphansModal(app, orphans).choose();
		if (picked.length > 0) await this.trash(picked);
	}

	private async trash(files: TFile[]): Promise<void> {
		let moved = 0;
		let failed = 0;
		for (const file of files) {
			try {
				await moveToTrash(this.host.app, file);
				moved++;
			} catch (error) {
				failed++;
				logError(error);
			}
		}
		const done = t(moved === 1 ? 'notice.orphans.done.one' : 'notice.orphans.done.other', { count: moved });
		new Notice(failed > 0 ? `${done}\n${t('notice.failed', { count: failed })}` : done);
	}
}

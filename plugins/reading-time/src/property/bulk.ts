import { Notice } from 'obsidian';
import type { TFile } from 'obsidian';
import { BULK_BATCH } from '../constants';
import { t } from '../i18n';
import { confirm } from '../ui/confirm-modal';
import { logError } from './writer';
import type { PropertyWriter, WriterHost } from './writer';

const yieldToUi = (): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, 0));

/**
 * "Update in all notes": finds the notes whose value is stale, says how many
 * before writing, then writes them one by one with a progress notice.
 */
export class BulkUpdate {
	private running = false;

	constructor(
		private readonly plugin: WriterHost,
		private readonly writer: PropertyWriter,
	) {}

	async run(): Promise<void> {
		if (this.running) {
			new Notice(t('notice.bulk.running'));
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
		const { vault, metadataCache } = this.plugin.app;
		const property = this.plugin.settings.property;
		// "Only notes that already have it" narrows the scope; otherwise every note is a candidate.
		const scope = property.mode === 'existing' ? 'existing' : 'all';
		const files = vault
			.getMarkdownFiles()
			.filter((file) => this.writer.eligible(file, metadataCache.getFileCache(file), scope));
		if (files.length === 0) {
			new Notice(t('notice.bulk.noNotes'));
			return;
		}

		const stale = await this.findStale(files);
		if (stale.length === 0) {
			new Notice(t('notice.bulk.upToDate', { count: files.length }));
			return;
		}

		const confirmed = await confirm(this.plugin.app, {
			title: t('modal.bulk.title'),
			paragraphs: [
				t('modal.bulk.message', { count: stale.length, total: files.length, property: property.name }),
				t(scope === 'existing' ? 'modal.bulk.scope.existing' : 'modal.bulk.scope.all'),
			],
			confirm: t('modal.bulk.confirm'),
		});
		if (confirmed) await this.write(stale);
	}

	private async findStale(files: TFile[]): Promise<TFile[]> {
		const notice = new Notice(t('notice.bulk.scanning'), 0);
		const stale: TFile[] = [];
		try {
			for (const [index, file] of files.entries()) {
				if ((await this.writer.check(file)).stale) stale.push(file);
				if (index % BULK_BATCH === BULK_BATCH - 1) await yieldToUi();
			}
		} finally {
			notice.hide();
		}
		return stale;
	}

	private async write(files: TFile[]): Promise<void> {
		const total = files.length;
		const notice = new Notice(t('notice.bulk.progress', { done: 0, total }), 0);
		let written = 0;
		let failed = 0;
		for (const [index, file] of files.entries()) {
			try {
				if ((await this.writer.update(file, true)) === 'written') written++;
			} catch (error) {
				failed++;
				logError(error);
			}
			if (index % BULK_BATCH === BULK_BATCH - 1) {
				notice.setMessage(t('notice.bulk.progress', { done: index + 1, total }));
				await yieldToUi();
			}
		}
		notice.hide();
		const done = t(written === 1 ? 'notice.bulk.done.one' : 'notice.bulk.done.other', { count: written });
		new Notice(failed > 0 ? `${done}\n${t('notice.bulk.failed', { count: failed })}` : done);
	}
}

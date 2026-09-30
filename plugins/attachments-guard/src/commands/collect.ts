import { Notice } from 'obsidian';
import type { TFile } from 'obsidian';
import { BULK_BATCH } from '../constants';
import type { GuardHost } from '../host';
import { t } from '../i18n';
import { confirmMoves } from '../ui/confirm-modal';
import { logError, moveFile } from '../vault/files';
import type { Target } from '../vault/planner';

interface Move {
	file: TFile;
	target: Target;
}

const yieldToUi = (): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, 0));

/**
 * "Collect loose attachments": every attachment outside the attachments
 * folder, listed with its destination, moved only after confirmation.
 */
export class CollectLoose {
	private running = false;

	constructor(private readonly host: GuardHost) {}

	async run(): Promise<void> {
		if (this.running) {
			new Notice(t('notice.collect.running'));
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
		const { app, rules, planner, settings } = this.host;
		const loose = rules
			.attachments()
			.filter((file) => !rules.isGuarded(file.path))
			.sort((a, b) => a.path.localeCompare(b.path));
		if (loose.length === 0) {
			new Notice(t('notice.collect.none', { folder: settings.folder }));
			return;
		}
		const batch = new Set<string>();
		const moves: Move[] = loose.map((file) => ({ file, target: planner.planExisting(file, batch) }));
		const confirmed = await confirmMoves(app, {
			title: t('modal.collect.title'),
			message: t(moves.length === 1 ? 'modal.collect.message.one' : 'modal.collect.message.other', {
				count: moves.length,
				folder: settings.folder,
			}),
			items: moves.map(({ file, target }) => ({ from: file.path, to: target.path })),
			confirm: t('modal.collect.confirm'),
		});
		if (confirmed) await this.move(moves);
	}

	private async move(moves: Move[]): Promise<void> {
		const { app, rules, planner } = this.host;
		const total = moves.length;
		const notice = new Notice(t('notice.collect.progress', { done: 0, total }), 0);
		let moved = 0;
		let failed = 0;
		for (const [index, { file, target }] of moves.entries()) {
			try {
				// Deleted or already moved since the list was shown.
				if (rules.isLoose(file) && app.vault.getFileByPath(file.path) === file) {
					// Taken since the plan (a file created meanwhile): plan again.
					const path = app.vault.getAbstractFileByPath(target.path) ? planner.planExisting(file).path : target.path;
					await moveFile(app, file, path);
					moved++;
				}
			} catch (error) {
				failed++;
				logError(error);
			}
			if (index % BULK_BATCH === BULK_BATCH - 1) {
				notice.setMessage(t('notice.collect.progress', { done: index + 1, total }));
				await yieldToUi();
			}
		}
		notice.hide();
		const done = t(moved === 1 ? 'notice.collect.done.one' : 'notice.collect.done.other', { count: moved });
		new Notice(failed > 0 ? `${done}\n${t('notice.failed', { count: failed })}` : done);
	}
}

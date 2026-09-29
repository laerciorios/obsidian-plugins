import { ButtonComponent, Modal } from 'obsidian';
import type { App } from 'obsidian';
import { t } from '../i18n';
import type { BoardProfile } from '../settings/model';
import { describePatternError, describeSkip } from './describe';
import type { ArchivePlan } from './planner';

export interface PreviewHandlers {
	onConfirm(): Promise<void>;
	onClose(): void;
}

const CLS = {
	root: 'bb-archive-preview',
	profile: 'bb-archive-profile',
	list: 'bb-archive-list',
	item: 'bb-archive-item',
	path: 'bb-archive-path',
	reason: 'bb-archive-reason',
	error: 'bb-archive-error',
	empty: 'bb-archive-empty',
	buttons: 'bb-archive-buttons',
} as const;

/** What an archive run would do, grouped by profile. Nothing moves until "Archive". */
export class ArchivePreviewModal extends Modal {
	constructor(
		app: App,
		private readonly plan: ArchivePlan,
		private readonly handlers: PreviewHandlers,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(t('preview.title'));
		const root = this.contentEl.createDiv({ cls: CLS.root });
		const { moves, skipped, errors } = this.plan;

		if (moves.length === 0 && skipped.length === 0 && errors.length === 0) {
			root.createDiv({ cls: CLS.empty, text: t('preview.empty') });
		}

		const profiles: BoardProfile[] = [];
		for (const item of [...errors, ...moves, ...skipped]) {
			if (!profiles.includes(item.profile)) profiles.push(item.profile);
		}

		for (const profile of profiles) {
			const section = root.createDiv({ cls: CLS.profile });
			section.createEl('h3', { text: profile.name });

			for (const error of errors.filter((e) => e.profile === profile)) {
				section.createDiv({ cls: CLS.error, text: t('preview.profileError', { error: describePatternError(error.error) }) });
			}

			const profileMoves = moves.filter((m) => m.profile === profile);
			if (profileMoves.length > 0) {
				section.createDiv({ text: t('preview.moves', { count: profileMoves.length }) });
				const list = section.createEl('ul', { cls: CLS.list });
				for (const move of profileMoves) {
					const li = list.createEl('li', { cls: CLS.item });
					li.createDiv({ cls: CLS.path, text: move.fromPath });
					li.createDiv({
						cls: CLS.reason,
						text: t('preview.moveTo', { folder: move.toFolder || '/', days: move.ageDays }),
					});
				}
			}

			const profileSkipped = skipped.filter((s) => s.profile === profile);
			if (profileSkipped.length > 0) {
				section.createDiv({ text: t('preview.skipped', { count: profileSkipped.length }) });
				const list = section.createEl('ul', { cls: CLS.list });
				for (const skip of profileSkipped) {
					const li = list.createEl('li', { cls: CLS.item });
					li.createDiv({ cls: CLS.path, text: skip.file.path });
					li.createDiv({ cls: CLS.reason, text: describeSkip(skip) });
				}
			}
		}

		const buttons = this.contentEl.createDiv({ cls: CLS.buttons });
		new ButtonComponent(buttons).setButtonText(t('preview.cancel')).onClick(() => this.close());
		const archive = new ButtonComponent(buttons)
			.setButtonText(t('preview.archive', { count: moves.length }))
			.setCta()
			.setDisabled(moves.length === 0)
			.onClick(async () => {
				archive.setDisabled(true);
				try {
					await this.handlers.onConfirm();
				} finally {
					this.close();
				}
			});
	}

	onClose(): void {
		this.contentEl.empty();
		this.handlers.onClose();
	}
}

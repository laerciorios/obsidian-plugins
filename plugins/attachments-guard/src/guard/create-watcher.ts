import { Notice, debounce } from 'obsidian';
import type { TAbstractFile, TFile } from 'obsidian';
import { CREATE_BATCH_MS } from '../constants';
import { BYTES_PER_MB, formatSize } from '../format';
import type { GuardHost } from '../host';
import { t } from '../i18n';
import { logError, moveFile } from '../vault/files';
import type { Target } from '../vault/planner';

const SIZE_NOTICE_MS = 10_000;

/**
 * New files after the vault has loaded: warns about large attachments, and
 * moves the ones that appear outside the attachments folder (dropped on the
 * file explorer, copied in by Finder or sync, created by plugins that skip
 * the attachment API).
 */
export class CreateWatcher {
	private readonly pending = new Set<string>();
	private readonly warned = new Set<string>();
	private readonly flush = debounce(() => void this.process(), CREATE_BATCH_MS, true);

	constructor(private readonly host: GuardHost) {}

	register(): void {
		// Before the layout is ready, "create" fires for every file of the vault as it loads.
		this.host.app.workspace.onLayoutReady(() => {
			this.host.registerEvent(this.host.app.vault.on('create', (file) => this.created(file)));
		});
	}

	cancel(): void {
		this.flush.cancel();
	}

	private created(file: TAbstractFile): void {
		const { rules, settings } = this.host;
		if (!rules.isAttachment(file) || rules.isIgnored(file.path)) return;
		this.warnSize(file);
		if (!settings.organize || !rules.isLoose(file)) return;
		this.pending.add(file.path);
		this.flush();
	}

	private warnSize(file: TFile): void {
		const limit = this.host.settings.maxSizeMb;
		if (limit <= 0 || file.stat.size <= limit * BYTES_PER_MB || this.warned.has(file.path)) return;
		this.warned.add(file.path);
		new Notice(t('notice.size', { name: file.name, size: formatSize(file.stat.size), limit: formatSize(limit * BYTES_PER_MB) }), SIZE_NOTICE_MS);
	}

	private async process(): Promise<void> {
		const { app, rules, planner } = this.host;
		const paths = [...this.pending];
		this.pending.clear();
		const batch = new Set<string>();
		const moved: Target[] = [];
		for (const path of paths) {
			// Moved, renamed or deleted in the meantime.
			const file = app.vault.getFileByPath(path);
			if (!rules.isLoose(file)) continue;
			const target = planner.planExisting(file, batch);
			try {
				await moveFile(app, file, target.path);
				moved.push(target);
			} catch (error) {
				logError(error);
			}
		}
		const [first] = moved;
		if (moved.length === 1 && first) new Notice(t('notice.moved.one', { path: first.path }));
		else if (moved.length > 1) new Notice(t('notice.moved.other', { count: moved.length, folder: this.host.settings.folder }));
	}
}

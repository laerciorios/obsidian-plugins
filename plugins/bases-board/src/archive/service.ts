import { Notice } from 'obsidian';
import type { App, Plugin } from 'obsidian';
import { t } from '../i18n';
import { MAX_INTERVAL_HOURS, MAX_STARTUP_DELAY_SECONDS } from '../settings/model';
import type { BoardProfile, BoardSettings } from '../settings/model';
import { executePlan } from './executor';
import type { ArchiveReport } from './executor';
import { planArchive } from './planner';
import type { ArchivePlan } from './planner';
import { ArchivePreviewModal } from './preview-modal';

export interface ArchiveHost extends Plugin {
	settings: BoardSettings;
	/** data.json could not be read: automatic archiving pauses until it is fixed. */
	settingsBroken: boolean;
	saveSettings(): Promise<void>;
}

type Trigger = 'auto' | 'manual';

const HOUR_MS = 3_600_000;
/** Longest wait on the startup run for the first 'resolved' event. */
const RESOLVED_WAIT_MS = 120_000;

/**
 * Runs archiving: on startup (after a delay), on an interval and by command.
 * One run at a time; automatic runs wait for the metadata cache; the first
 * run of each profile can require confirming a preview.
 */
export class ArchiveService {
	private running = false;
	private unloaded = false;
	/** A 'resolved' event arrived since the plugin loaded: the index matches the disk. */
	private resolvedSeen = false;
	private resolvedWaiters: (() => void)[] = [];
	private preview: ArchivePreviewModal | null = null;
	private startupTimer: number | null = null;
	private intervalTimer: number | null = null;

	constructor(private readonly plugin: ArchiveHost) {}

	private get app(): App {
		return this.plugin.app;
	}

	private get settings(): BoardSettings {
		return this.plugin.settings;
	}

	start(): void {
		this.plugin.registerEvent(
			this.app.metadataCache.on('resolved', () => {
				this.resolvedSeen = true;
				for (const wake of this.resolvedWaiters.splice(0)) wake();
			}),
		);
		this.plugin.register(() => {
			this.unloaded = true;
			this.clearTimers();
			for (const wake of this.resolvedWaiters.splice(0)) wake();
			this.preview?.close();
		});
		this.app.workspace.onLayoutReady(() => {
			if (this.unloaded) return;
			const { archive } = this.settings;
			if (archive.enabled && archive.runOnStartup) {
				const delay = Math.min(archive.startupDelaySeconds, MAX_STARTUP_DELAY_SECONDS) * 1000;
				this.startupTimer = window.setTimeout(() => void this.startupRun(), delay);
			}
			this.scheduleInterval();
		});
	}

	/** Re-read the interval after a settings change. */
	reschedule(): void {
		if (this.intervalTimer !== null) window.clearInterval(this.intervalTimer);
		this.intervalTimer = null;
		if (this.app.workspace.layoutReady) this.scheduleInterval();
	}

	private scheduleInterval(): void {
		const { enabled, intervalHours } = this.settings.archive;
		if (this.unloaded || !enabled || intervalHours <= 0) return;
		// Capped: timer delays above 2^31-1 ms (~24.8 days) would fire immediately, in a loop.
		const hours = Math.min(intervalHours, MAX_INTERVAL_HOURS);
		this.intervalTimer = window.setInterval(() => void this.runAutomatic(), hours * HOUR_MS);
	}

	private clearTimers(): void {
		if (this.startupTimer !== null) window.clearTimeout(this.startupTimer);
		if (this.intervalTimer !== null) window.clearInterval(this.intervalTimer);
		this.startupTimer = null;
		this.intervalTimer = null;
	}

	/** Every markdown file has metadata (the saved index may still be catching up). */
	private allCached(): boolean {
		const cache = this.app.metadataCache;
		return this.app.vault.getMarkdownFiles().every((file) => cache.getFileCache(file) !== null);
	}

	/**
	 * The startup run waits for the first 'resolved' event, so notes changed
	 * while Obsidian was closed (sync, git) are judged by their current status.
	 * If the plugin loaded after the initial indexing, the event may never come:
	 * after a timeout, fall back to "every file has metadata".
	 */
	private async startupRun(): Promise<void> {
		if (!this.resolvedSeen) {
			await new Promise<void>((resolve) => {
				const timer = window.setTimeout(resolve, RESOLVED_WAIT_MS);
				this.resolvedWaiters.push(() => {
					window.clearTimeout(timer);
					resolve();
				});
			});
		}
		if (this.resolvedSeen || this.allCached()) await this.runAutomatic(true);
	}

	private enabledProfiles(ids?: readonly string[]): BoardProfile[] {
		return this.settings.profiles.filter((p) => p.archive.enabled && (!ids || ids.includes(p.id)));
	}

	private needsConfirmation(profile: BoardProfile): boolean {
		return this.settings.archive.confirmFirstRun && !this.settings.confirmedProfiles.includes(profile.id);
	}

	plan(profiles: readonly BoardProfile[]): ArchivePlan {
		return planArchive(this.app, this.settings.profiles, {
			maxPerRun: this.settings.archive.maxPerRun,
			only: new Set(profiles.map((p) => p.id)),
		});
	}

	// ---- entry points ---------------------------------------------------

	async runAutomatic(indexChecked = false): Promise<void> {
		if (this.unloaded || this.plugin.settingsBroken || !this.settings.archive.enabled || this.running) return;
		if (!indexChecked && !this.resolvedSeen && !this.allCached()) return;
		const profiles = this.enabledProfiles();
		const confirmed = profiles.filter((p) => !this.needsConfirmation(p));
		const pending = profiles.filter((p) => this.needsConfirmation(p));
		if (confirmed.length > 0) await this.run(confirmed, 'auto');
		// Unconfirmed profiles: ask only when there is something to move.
		if (pending.length > 0 && !this.preview && !this.unloaded) {
			const plan = this.plan(pending);
			if (plan.moves.length > 0) this.openPreview(pending, plan);
		}
	}

	/** "Archive now": unconfirmed profiles go through the preview first. */
	async archiveNow(ids?: readonly string[]): Promise<void> {
		if (!this.readyForManualRun()) return;
		const profiles = this.enabledProfiles(ids);
		if (profiles.length === 0) {
			new Notice(t('notice.noProfiles'));
			return;
		}
		if (profiles.some((p) => this.needsConfirmation(p))) {
			this.openPreview(profiles, this.plan(profiles));
			return;
		}
		await this.run(profiles, 'manual');
	}

	showPreview(ids?: readonly string[]): void {
		if (!this.readyForManualRun()) return;
		this.openPreview(this.enabledProfiles(ids), this.plan(this.enabledProfiles(ids)));
	}

	private readyForManualRun(): boolean {
		if (this.plugin.settingsBroken) {
			new Notice(t('notice.settingsBroken'));
			return false;
		}
		if (this.running) {
			new Notice(t('notice.alreadyRunning'));
			return false;
		}
		if (!this.resolvedSeen && !this.allCached()) {
			new Notice(t('notice.indexing'));
			return false;
		}
		return true;
	}

	private openPreview(profiles: BoardProfile[], plan: ArchivePlan): void {
		this.preview?.close();
		const modal = new ArchivePreviewModal(this.app, plan, {
			onConfirm: async () => {
				if (this.unloaded) return;
				const report = await this.run(profiles, 'manual');
				if (report) await this.markConfirmed(report);
			},
			onClose: () => {
				if (this.preview === modal) this.preview = null;
			},
		});
		this.preview = modal;
		modal.open();
	}

	/**
	 * Only profiles that actually moved cards without errors count as
	 * confirmed: a profile shown with nothing to move, or with an error, will
	 * ask again the first time it has something to move.
	 */
	private async markConfirmed(report: ArchiveReport): Promise<void> {
		const failed = new Set(report.errors.map((e) => e.profile.id));
		const ids = new Set(this.settings.confirmedProfiles);
		for (const moved of report.moved) if (!failed.has(moved.profile.id)) ids.add(moved.profile.id);
		this.settings.confirmedProfiles = [...ids];
		await this.plugin.saveSettings();
	}

	private async run(profiles: readonly BoardProfile[], trigger: Trigger): Promise<ArchiveReport | null> {
		if (this.running || this.unloaded) return null;
		this.running = true;
		try {
			const report = await executePlan(this.app, this.plan(profiles), () => this.unloaded);
			if (!this.unloaded) this.notify(report, trigger);
			return report;
		} finally {
			this.running = false;
		}
	}

	private notify(report: ArchiveReport, trigger: Trigger): void {
		const limited = report.skipped.filter((s) => s.reason === 'limit').length;
		const skipped = report.skipped.length - limited;
		const notIndexed = report.moved.filter((m) => !m.indexed).length;
		const quiet = report.moved.length === 0 && report.errors.length === 0 && report.failed.length === 0;
		if (trigger === 'auto' && (quiet || !this.settings.archive.notify)) return;
		if (trigger === 'manual' && quiet && skipped === 0) {
			new Notice(t('notice.nothingToArchive'));
			return;
		}

		const lines: string[] = [];
		const moved = report.moved.length;
		lines.push(moved === 1 ? t('notice.archived.one') : t('notice.archived.other', { count: moved }));
		if (skipped > 0) lines.push(t('notice.skipped', { count: skipped }));
		if (limited > 0) lines.push(t('notice.limit', { count: limited }));
		if (notIndexed > 0) lines.push(t('notice.notIndexed', { count: notIndexed }));
		const reopened = report.failed.filter((f) => f.reason !== 'error').length;
		const errors = report.failed.length - reopened;
		if (reopened > 0) lines.push(t('notice.changedSincePlan', { count: reopened }));
		if (errors > 0) lines.push(t('notice.failed', { count: errors }));
		if (report.errors.length > 0) {
			lines.push(t('notice.profileErrors', { names: report.errors.map((e) => e.profile.name).join(', ') }));
		}
		new Notice(lines.join('\n'), 8000);
	}
}

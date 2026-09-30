import { Modal, Notice, Setting } from 'obsidian';
import type { App } from 'obsidian';
import { BULK_BATCH, CLS, MAX_LISTED } from '../constants';
import { t } from '../i18n';
import type { RulesFile } from '../rules/rules-file';
import { RULE_IDS } from '../types';
import type { Finding, RuleId, ScanResult, VaultRules } from '../types';
import { errorMessage, logError } from '../vault/files';
import { applyFix, fixTarget, isOneClick, renameFolder } from '../vault/fixes';
import { nameOf } from '../vault/paths';
import { scan } from '../vault/scanner';
import { confirmChanges } from './confirm-modal';
import { RenameFolderModal } from './rename-modal';

const yieldToUi = (): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, 0));

function groupTitle(rule: RuleId, rules: VaultRules): string {
	switch (rule) {
		case 'readme':
			return t('group.readme');
		case 'missing-index':
			return t('group.missingIndex');
		case 'ai-outside':
			return t('group.aiOutside', { tag: rules.aiTag, folder: rules.aiFolder });
		case 'file-case':
			return t('group.fileCase');
		case 'folder-case':
			return t('group.folderCase');
	}
}

function fixLabel(finding: Finding): string {
	switch (finding.fix?.kind) {
		case 'create-index':
			return t('fix.createIndex');
		case 'rename-folder':
			return t('fix.renameFolder');
		default:
			return finding.rule === 'ai-outside' ? t('fix.move') : t('fix.rename');
	}
}

/** The line under the path: what the fix does, or why there is none. */
function describe(finding: Finding): string {
	const fix = finding.fix;
	if (!fix) {
		if (finding.reason === 'index-exists') return t('reason.indexExists');
		if (finding.reason === 'root') return t('reason.root');
		return t('reason.noName');
	}
	if (fix.kind === 'rename-folder') return t('target.suggestion', { name: fix.suggestion });
	// Renames in place show only the new name; moves show the whole path.
	return t('target.to', { path: finding.rule === 'ai-outside' ? fix.to : nameOf(fix.to) });
}

/**
 * "Check vault structure": every finding grouped by rule, each with its fix
 * and "Ignore". The row shows where the fix leads before the click; "Fix all"
 * lists every change first. Checks again after every change.
 */
export class ReportModal extends Modal {
	private result: ScanResult = { findings: [], folders: 0, notes: 0 };
	private busy = false;

	constructor(
		app: App,
		private readonly rulesFile: RulesFile,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(t('report.title'));
		this.modalEl.addClass(CLS.report);
		this.refresh();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private get rules(): VaultRules {
		return this.rulesFile.current();
	}

	private refresh(): void {
		this.result = scan(this.app, this.rules);
		this.render();
	}

	private render(): void {
		const { contentEl, result } = this;
		const rules = this.rules;
		contentEl.empty();

		const { findings, folders, notes } = result;
		const count = findings.length;
		const summary = count === 0
			? t('report.clean', { folders, notes })
			: t(count === 1 ? 'report.summary.one' : 'report.summary.other', { count, folders, notes });
		const source = this.rulesFile.file()
			? t('report.rules', { path: this.rulesFile.path })
			: t('report.rules.default', { path: this.rulesFile.path });
		new Setting(contentEl)
			.setClass(CLS.summary)
			.setName(summary)
			.setDesc(source)
			.addButton((button) => button.setButtonText(t('report.rescan')).onClick(() => this.refresh()));

		for (const rule of RULE_IDS) {
			const group = findings.filter((finding) => finding.rule === rule);
			if (group.length > 0) this.renderGroup(rule, group, rules);
		}
	}

	private renderGroup(rule: RuleId, group: Finding[], rules: VaultRules): void {
		const title = groupTitle(rule, rules);
		const section = this.contentEl.createDiv({ cls: CLS.group });
		const heading = new Setting(section).setHeading().setName(t('report.heading', { title, count: group.length }));
		const fixable = group.filter(isOneClick);
		if (fixable.length > 1) {
			heading.addButton((button) =>
				button.setButtonText(t('report.fixAll', { count: fixable.length })).onClick(() => void this.fixAll(title, fixable)),
			);
		}
		for (const finding of group.slice(0, MAX_LISTED)) this.renderRow(section, finding);
		const more = group.length - MAX_LISTED;
		if (more > 0) section.createEl('p', { cls: CLS.muted, text: t('modal.more', { count: more }) });
	}

	private renderRow(section: HTMLElement, finding: Finding): void {
		const row = new Setting(section).setClass(CLS.row).setName(finding.path).setDesc(describe(finding));
		if (finding.fix) {
			row.addButton((button) => button.setButtonText(fixLabel(finding)).onClick(() => void this.fixOne(finding)));
		}
		row.addButton((button) =>
			button
				.setButtonText(t('report.ignore'))
				.setTooltip(t('report.ignore.tooltip'))
				.onClick(() => void this.ignore(finding)),
		);
	}

	/** One change at a time; the vault is checked again afterwards. */
	private async guard(action: () => Promise<void>): Promise<void> {
		if (this.busy) return;
		this.busy = true;
		try {
			await action();
		} finally {
			this.busy = false;
			this.refresh();
		}
	}

	private fixOne(finding: Finding): Promise<void> {
		return this.guard(async () => {
			try {
				if (finding.fix?.kind === 'rename-folder') await this.renameFolder(finding, finding.fix.suggestion);
				else await applyFix(this.app, this.rules, finding);
			} catch (error) {
				logError(error);
				new Notice(t('notice.fixFailed', { path: finding.path, message: errorMessage(error) }));
			}
		});
	}

	private async renameFolder(finding: Finding, suggestion: string): Promise<void> {
		const folder = this.app.vault.getFolderByPath(finding.path);
		if (!folder) return;
		const name = await new RenameFolderModal(this.app, folder, suggestion).choose();
		if (name) await renameFolder(this.app, finding.path, name);
	}

	private fixAll(title: string, findings: Finding[]): Promise<void> {
		return this.guard(async () => {
			const count = findings.length;
			const creates = findings.every((finding) => finding.fix?.kind === 'create-index');
			const message = creates
				? t(count === 1 ? 'confirm.create.one' : 'confirm.create.other', { count })
				: t(count === 1 ? 'confirm.message.one' : 'confirm.message.other', { count });
			const confirmed = await confirmChanges(this.app, {
				title: t('confirm.title', { group: title }),
				message,
				items: findings.map((finding) => ({ from: finding.path, to: fixTarget(finding) ?? '' })),
				confirm: t('confirm.ok'),
			});
			if (!confirmed) return;
			const total = count;
			const notice = new Notice(t('notice.fixing', { done: 0, total }), 0);
			let fixed = 0;
			let failed = 0;
			for (const [index, finding] of findings.entries()) {
				try {
					if (await applyFix(this.app, this.rules, finding)) fixed++;
				} catch (error) {
					failed++;
					logError(error);
				}
				if (index % BULK_BATCH === BULK_BATCH - 1) {
					notice.setMessage(t('notice.fixing', { done: index + 1, total }));
					await yieldToUi();
				}
			}
			notice.hide();
			const done = t(fixed === 1 ? 'notice.fixed.one' : 'notice.fixed.other', { count: fixed });
			new Notice(failed > 0 ? `${done}\n${t('notice.failed', { count: failed })}` : done);
		});
	}

	private ignore(finding: Finding): Promise<void> {
		return this.guard(async () => {
			try {
				await this.rulesFile.ignore(finding.path);
				new Notice(t('notice.ignored', { path: finding.path }));
			} catch (error) {
				logError(error);
				new Notice(t('notice.error', { message: errorMessage(error) }));
			}
		});
	}
}

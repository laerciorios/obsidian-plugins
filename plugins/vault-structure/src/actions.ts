import { Notice } from 'obsidian';
import type { StructureHost } from './host';
import { t } from './i18n';
import { NewAreaModal } from './ui/new-area-modal';
import { ReportModal } from './ui/report-modal';
import { createArea, defaultParent, parentOptions } from './vault/areas';
import { errorMessage, logError } from './vault/files';
import { joinPath } from './vault/paths';

function fail(error: unknown): void {
	logError(error);
	new Notice(t('notice.error', { message: errorMessage(error) }));
}

/** The three things the plugin does, shared by commands, menus and settings. */
export class Actions {
	constructor(private readonly host: StructureHost) {}

	/** "New area or topic", inside `parent` or the folder of the active note. */
	async newArea(parent?: string): Promise<void> {
		const { app, rules: rulesFile } = this.host;
		const rules = rulesFile.current();
		const options = parentOptions(app, rules);
		if (options.length === 0) {
			new Notice(t('notice.noRoots'));
			return;
		}
		const initial = parent ?? defaultParent(options, app.workspace.getActiveFile()?.path ?? null);
		const request = await new NewAreaModal(app, rules, options, initial).choose();
		if (!request) return;
		try {
			const index = await createArea(app, rules, request.parent, request.name);
			const isArea = options.find((option) => option.path === request.parent)?.level === 0;
			const path = joinPath(request.parent, request.name);
			new Notice(t(isArea ? 'notice.created.area' : 'notice.created.topic', { path }));
			await app.workspace.getLeaf(false).openFile(index);
		} catch (error) {
			fail(error);
		}
	}

	check(): void {
		new ReportModal(this.host.app, this.host.rules).open();
	}

	async openRules(): Promise<void> {
		try {
			const { file, created } = await this.host.rules.ensure();
			if (created) new Notice(t('notice.rules.created', { path: file.path }));
			await this.host.app.workspace.getLeaf(false).openFile(file);
		} catch (error) {
			fail(error);
		}
	}
}

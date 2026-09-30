import { Keymap, Modal, Notice, SearchComponent, setTooltip } from 'obsidian';
import type { EventRef, TFile, moment } from 'obsidian';
import { CLS } from '../constants';
import type { WorkLogHost } from '../host';
import { inMeetingsFolder } from '../meetings/meetings';
import { t } from '../i18n';
import type { Project, Suggestions } from '../types';
import { countText, matchesQuery, statusText } from './format';

/**
 * "Log today's projects": one checkbox per project, written to the daily note
 * on click. Suggestions from the day's meeting notes come first.
 */
export class LogModal extends Modal {
	private query = '';
	private logged = new Set<string>();
	private suggestions: Suggestions = new Map();
	private readonly events: EventRef[] = [];
	private suggestionsEl!: HTMLElement;
	private listEl!: HTMLElement;
	private footerEl!: HTMLElement;
	private search!: SearchComponent;

	constructor(
		private readonly host: WorkLogHost,
		private readonly file: TFile,
		private readonly date: moment.Moment,
	) {
		super(host.app);
	}

	onOpen(): void {
		this.modalEl.addClass(CLS.modal);
		this.setTitle(t('modal.title', { date: this.date.format('LL') }));
		const { contentEl } = this;
		contentEl.createDiv({ cls: CLS.muted, text: this.file.path });

		this.search = new SearchComponent(contentEl.createDiv({ cls: CLS.search }))
			.setPlaceholder(t('modal.search'))
			.onChange((query) => {
				this.query = query;
				this.render();
			});
		this.search.inputEl.addEventListener('keydown', (evt) => {
			if (evt.key !== 'Enter' || evt.isComposing) return;
			// Enter toggles the project when the search leaves exactly one.
			const rows = this.visibleProjects();
			const only = rows.length === 1 ? rows[0] : undefined;
			if (!only) return;
			evt.preventDefault();
			void this.toggle(only, !this.logged.has(only.path));
		});

		this.suggestionsEl = contentEl.createDiv({ cls: CLS.suggestions });
		this.listEl = contentEl.createDiv({ cls: CLS.list });
		this.footerEl = contentEl.createDiv({ cls: CLS.footer });

		this.reload();
		const { metadataCache } = this.app;
		this.events.push(
			metadataCache.on('changed', (file) => {
				const { meetingsFolder } = this.host.settings;
				const relevant =
					file.path === this.file.path ||
					this.host.projects.get(file.path) !== undefined ||
					inMeetingsFolder(file.path, meetingsFolder);
				if (relevant) this.reload();
			}),
		);
		window.setTimeout(() => this.search.inputEl.focus(), 0);
	}

	onClose(): void {
		for (const ref of this.events) this.app.metadataCache.offref(ref);
		this.events.length = 0;
		this.contentEl.empty();
	}

	/** Re-read what the note lists and the day's meetings, then redraw. */
	private reload(): void {
		this.logged = this.host.writer.logged(this.file);
		this.suggestions = this.host.meetings.suggestions(this.date);
		this.render();
	}

	/** Active projects, plus the ones already logged or suggested whatever their status. */
	private candidates(): Project[] {
		return this.host.projects
			.all()
			.filter((project) => project.active || this.logged.has(project.path) || this.suggestions.has(project.path));
	}

	private visibleProjects(): Project[] {
		return this.candidates().filter((project) => matchesQuery(project, this.query));
	}

	private render(): void {
		// Redrawing replaces the rows: keep the keyboard focus on the same project.
		const focused = activeDocument.activeElement?.closest<HTMLElement>('[data-path]')?.dataset.path;
		this.draw();
		if (focused) {
			const row = [...this.contentEl.querySelectorAll<HTMLElement>('[data-path]')].find((el) => el.dataset.path === focused);
			row?.querySelector('input')?.focus();
		}
	}

	private draw(): void {
		this.suggestionsEl.empty();
		this.listEl.empty();
		const candidates = this.candidates();
		const searching = this.query.trim().length > 0;
		const suggested = searching ? [] : candidates.filter((project) => this.suggestions.has(project.path));
		const rest = searching
			? candidates.filter((project) => matchesQuery(project, this.query))
			: candidates.filter((project) => !this.suggestions.has(project.path));

		if (suggested.length > 0) this.renderSuggestions(suggested);
		for (const project of rest) this.renderRow(this.listEl, project);

		if (candidates.length === 0) {
			const statuses = this.host.settings.activeStatuses.join(', ') || '—';
			this.listEl.createDiv({ cls: CLS.empty, text: t('modal.empty', { statuses }) });
		} else if (searching && rest.length === 0) {
			this.listEl.createDiv({ cls: CLS.empty, text: t('modal.noMatch', { query: this.query.trim() }) });
		}
		this.renderFooter();
	}

	private renderSuggestions(projects: Project[]): void {
		const head = this.suggestionsEl.createDiv({ cls: CLS.suggestionsHead });
		head.createSpan({ text: t('modal.suggestions') });
		const pending = projects.filter((project) => !this.logged.has(project.path));
		if (pending.length > 0) {
			const button = head.createEl('button', { text: t('modal.markSuggested', { count: pending.length }) });
			button.addEventListener('click', () => void this.addAll(pending));
		}
		const list = this.suggestionsEl.createDiv({ cls: CLS.list });
		for (const project of projects) this.renderRow(list, project);
	}

	private renderRow(parent: HTMLElement, project: Project): void {
		const row = parent.createEl('label', { cls: CLS.row, attr: { 'data-path': project.path } });
		const box = row.createEl('input', { type: 'checkbox' });
		box.checked = this.logged.has(project.path);
		box.addEventListener('change', () => void this.toggle(project, box.checked));

		const text = row.createDiv();
		text.createDiv({ cls: CLS.rowName, text: project.name });
		const meta = text.createDiv({ cls: CLS.rowMeta });
		if (project.context) meta.createSpan({ text: project.context });
		if (!project.active) meta.createSpan({ cls: CLS.badge, text: statusText(project.status) });
		for (const meeting of this.suggestions.get(project.path) ?? []) this.renderMeeting(meta, meeting);
	}

	/** "in the meeting <title>": opens the meeting note in a new tab. */
	private renderMeeting(parent: HTMLElement, meeting: TFile): void {
		const span = parent.createSpan({ cls: CLS.suggested });
		span.appendText(`${t('modal.inMeeting')} `);
		const link = span.createEl('a', { cls: 'internal-link', text: this.host.meetings.title(meeting), href: meeting.path });
		setTooltip(link, meeting.path);
		link.addEventListener('click', (evt) => {
			// The link sits inside the row label: do not toggle the checkbox.
			evt.preventDefault();
			evt.stopPropagation();
			this.close();
			void this.app.workspace.openLinkText(meeting.path, '', Keymap.isModEvent(evt) || 'tab');
		});
	}

	private renderFooter(): void {
		this.footerEl.empty();
		this.footerEl.createSpan({ cls: CLS.muted, text: countText(this.logged.size) });
		if (this.app.workspace.getActiveFile()?.path !== this.file.path) {
			const button = this.footerEl.createEl('button', { text: t('modal.openDaily') });
			button.addEventListener('click', () => {
				this.close();
				void this.host.daily.open(this.file);
			});
		}
	}

	private async toggle(project: Project, on: boolean): Promise<void> {
		if (on) this.logged.add(project.path);
		else this.logged.delete(project.path);
		this.render();
		try {
			await this.host.writer.set(this.file, project, on);
		} catch (error) {
			console.error('Daily Work Log: could not update the note', error);
			new Notice(t('notice.writeFailed', { path: this.file.path }));
			this.reload();
		}
	}

	private async addAll(projects: Project[]): Promise<void> {
		for (const project of projects) this.logged.add(project.path);
		this.render();
		try {
			await this.host.writer.add(this.file, projects);
		} catch (error) {
			console.error('Daily Work Log: could not update the note', error);
			new Notice(t('notice.writeFailed', { path: this.file.path }));
			this.reload();
		}
	}
}

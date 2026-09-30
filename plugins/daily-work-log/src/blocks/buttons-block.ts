import { MarkdownRenderChild, Notice, setTooltip } from 'obsidian';
import type { MarkdownPostProcessorContext, TFile } from 'obsidian';
import { CLS } from '../constants';
import type { WorkLogHost } from '../host';
import { t } from '../i18n';
import type { Project, Suggestions } from '../types';
import { statusText } from '../ui/format';

/**
 * ```work-log: one toggle button per project, writing the `projects` of the
 * note the block is in. In a daily note, the projects of that day's meeting
 * notes are highlighted.
 */
export class ButtonsBlock extends MarkdownRenderChild {
	/** Content of the last draw; a change that does not alter it skips the redraw. */
	private drawn = '';
	/** Projects and order of the buttons on screen: when unchanged, they are updated in place. */
	private layout = '';

	constructor(
		containerEl: HTMLElement,
		private readonly host: WorkLogHost,
		private readonly ctx: MarkdownPostProcessorContext,
	) {
		super(containerEl);
	}

	onload(): void {
		this.draw();
		this.register(this.host.changes.on(() => this.draw()));
		// One listener for every button, so redraws never pile up handlers.
		this.registerDomEvent(this.containerEl, 'click', (evt) => this.click(evt));
	}

	private draw(): void {
		const file = this.host.app.vault.getFileByPath(this.ctx.sourcePath);
		if (!file) return;
		const logged = this.host.writer.logged(file);
		const date = this.host.daily.dateOf(file.path);
		const suggestions: Suggestions = date ? this.host.meetings.suggestions(date) : new Map<string, TFile[]>();
		const projects = this.host.projects
			.all()
			.filter((project) => project.active || logged.has(project.path) || suggestions.has(project.path));

		const state = JSON.stringify(
			projects.map((project) => [
				project.path,
				project.name,
				project.status,
				logged.has(project.path),
				suggestions.get(project.path)?.map((meeting) => meeting.path),
			]),
		);
		if (state === this.drawn) return;
		this.drawn = state;

		// Updating in place keeps the hovered button (and its tooltip) after a click.
		const layout = JSON.stringify(projects.map((project) => project.path));
		const existing = this.containerEl.querySelectorAll<HTMLButtonElement>(`.${CLS.chip}`);
		if (layout === this.layout && existing.length === projects.length) {
			projects.forEach((project, index) => {
				const button = existing[index];
				if (button) this.decorate(button, project, logged.has(project.path), suggestions.get(project.path));
			});
			return;
		}
		this.layout = layout;

		this.containerEl.empty();
		const box = this.containerEl.createDiv({ cls: CLS.buttons });
		if (projects.length === 0) {
			box.createDiv({ cls: CLS.empty, text: t('block.empty') });
			return;
		}
		for (const project of projects) {
			const button = box.createEl('button', { cls: CLS.chip });
			this.decorate(button, project, logged.has(project.path), suggestions.get(project.path));
		}
	}

	private decorate(button: HTMLButtonElement, project: Project, on: boolean, meetings: TFile[] | undefined): void {
		button.setText(project.name);
		button.dataset.path = project.path;
		button.setAttribute('aria-pressed', String(on));
		button.toggleClass('is-suggested', meetings !== undefined && !on);
		const tips = [on ? t('block.unmark') : t('block.mark')];
		if (!project.active) tips.push(statusText(project.status));
		if (meetings) {
			tips.push(t('block.suggested', { meetings: meetings.map((meeting) => this.host.meetings.title(meeting)).join(', ') }));
		}
		setTooltip(button, tips.join('\n'));
	}

	private click(evt: MouseEvent): void {
		const button = (evt.target as HTMLElement | null)?.closest<HTMLButtonElement>(`.${CLS.chip}`);
		const project = button?.dataset.path ? this.host.projects.get(button.dataset.path) : undefined;
		const file = this.host.app.vault.getFileByPath(this.ctx.sourcePath);
		if (!button || !project || !file) return;
		evt.preventDefault();
		evt.stopPropagation();
		const next = button.getAttribute('aria-pressed') !== 'true';
		// Answer right away; the redraw after the note is indexed confirms it.
		button.setAttribute('aria-pressed', String(next));
		button.toggleClass('is-suggested', false);
		this.drawn = '';
		this.host.writer.set(file, project, next).catch((error: unknown) => {
			console.error('Daily Work Log: could not update the note', error);
			new Notice(t('notice.writeFailed', { path: file.path }));
			this.draw();
		});
	}
}

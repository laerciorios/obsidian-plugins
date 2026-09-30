import { MarkdownRenderChild, moment, setIcon, setTooltip } from 'obsidian';
import type { MarkdownPostProcessorContext } from 'obsidian';
import { CLS } from '../constants';
import type { WorkLogHost } from '../host';
import { t } from '../i18n';
import { compareProjects, isProject } from '../projects/project-index';
import { inRange, parseOptions, periodRange, summarize } from '../summary/period';
import type { DayEntry, OptionError, Range, SummaryOptions } from '../summary/period';
import type { Project } from '../types';
import { daysText } from '../ui/format';
import { noteLink } from '../ui/links';

function errorText(error: OptionError): string {
	switch (error.code) {
		case 'key':
			return t('summary.error.key', { key: error.key });
		case 'period':
			return t('summary.error.period', { value: error.value });
		case 'date':
			return t('summary.error.date', { value: error.value });
		case 'line':
			return t('summary.error.line', { line: error.line });
	}
}

function capitalize(text: string): string {
	return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/**
 * ```work-log-summary: days worked per project in a week or a month, from the
 * daily notes. The arrows move between periods without writing anything.
 */
export class SummaryBlock extends MarkdownRenderChild {
	private readonly options: SummaryOptions;
	private readonly errors: OptionError[];
	private offset = 0;
	private drawn = '';
	/** Built once, so the arrow under the mouse (and its tooltip) survives a redraw. */
	private headEl!: HTMLElement;
	private titleEl!: HTMLElement;
	private resetEl!: HTMLElement;
	private bodyEl!: HTMLElement;

	constructor(
		containerEl: HTMLElement,
		private readonly host: WorkLogHost,
		source: string,
		private readonly ctx: MarkdownPostProcessorContext,
	) {
		super(containerEl);
		const parsed = parseOptions(source);
		this.options = parsed.options;
		this.errors = parsed.errors;
	}

	onload(): void {
		this.frame();
		this.draw();
		this.register(this.host.changes.on(() => this.draw()));
		this.registerDomEvent(this.containerEl, 'click', (evt) => {
			const button = (evt.target as HTMLElement | null)?.closest<HTMLElement>('[data-move]');
			if (!button) return;
			evt.preventDefault();
			evt.stopPropagation();
			const move = Number(button.dataset.move);
			this.offset = move === 0 ? 0 : this.offset + move;
			this.draw();
		});
	}

	/** The only project shown: the `project` option, else the project note the block is in. */
	private filter(): Project | null | undefined {
		const { project } = this.options;
		if (project) return this.host.projects.projectOf(project, this.ctx.sourcePath) ?? undefined;
		const host = this.host.app.vault.getFileByPath(this.ctx.sourcePath);
		if (host && isProject(this.host.app.metadataCache.getFileCache(host))) return this.host.projects.get(host.path) ?? null;
		return null;
	}

	private entries(range: Range): DayEntry<Project>[] {
		const entries: DayEntry<Project>[] = [];
		for (const file of this.host.app.vault.getMarkdownFiles()) {
			const date = this.host.daily.dateOf(file.path);
			if (!date || !inRange(date, range)) continue;
			const projects = [...this.host.writer.logged(file)]
				.map((path) => this.host.projects.get(path))
				.filter((project): project is Project => project !== undefined);
			entries.push({ date, path: file.path, projects });
		}
		return entries;
	}

	private frame(): void {
		const { period } = this.options;
		const box = this.containerEl.createDiv({ cls: CLS.summary });
		for (const error of this.errors) box.createDiv({ cls: CLS.error, text: errorText(error) });
		this.headEl = box.createDiv({ cls: CLS.summaryHead });
		const button = (move: number, icon: string, label: string) => {
			const el = this.headEl.createEl('button', { cls: 'clickable-icon', attr: { 'data-move': String(move), 'aria-label': label } });
			setIcon(el, icon);
			return el;
		};
		button(-1, 'chevron-left', t(period === 'week' ? 'summary.previousWeek' : 'summary.previousMonth'));
		this.titleEl = this.headEl.createDiv({ cls: CLS.summaryTitle });
		button(1, 'chevron-right', t(period === 'week' ? 'summary.nextWeek' : 'summary.nextMonth'));
		this.resetEl = button(0, 'rotate-ccw', t('summary.reset'));
		this.bodyEl = box.createDiv();
	}

	private draw(): void {
		const { period } = this.options;
		const anchor = this.options.date ?? moment();
		const range = periodRange(anchor, period, this.offset, this.host.settings.weekStart);
		const filter = this.filter();
		const { rows, days } = summarize(this.entries(range), range, compareProjects);
		const shown = filter ? rows.filter((row) => row.project === filter) : rows;

		const state = JSON.stringify([
			range.start.valueOf(),
			filter === undefined ? '?' : (filter?.path ?? ''),
			days,
			shown.map((row) => [row.project.path, row.project.name, row.days.map((day) => day.path)]),
		]);
		if (state === this.drawn) return;
		this.drawn = state;

		this.bodyEl.empty();
		this.headEl.toggle(filter !== undefined);
		if (filter === undefined) {
			this.bodyEl.createDiv({ cls: CLS.error, text: t('summary.error.project', { project: this.options.project ?? '' }) });
			return;
		}
		this.titleEl.setText(this.title(range));
		this.resetEl.toggle(this.offset !== 0);

		if (shown.length === 0) {
			this.bodyEl.createDiv({ cls: CLS.empty, text: t(period === 'week' ? 'summary.empty.week' : 'summary.empty.month') });
			return;
		}
		const list = this.bodyEl.createEl('ul', { cls: CLS.summaryList });
		for (const row of shown) {
			const item = list.createEl('li');
			if (!filter) {
				noteLink(this.host.app, this, item, { text: row.project.name, path: row.project.path, sourcePath: this.ctx.sourcePath });
				item.appendText(' — ');
			}
			item.createSpan({ text: daysText(row.days.length) });
			const chips = item.createSpan({ cls: CLS.summaryDays });
			for (const day of row.days) {
				const link = noteLink(this.host.app, this, chips, {
					text: day.date.format(period === 'week' ? 'ddd D' : 'D MMM'),
					path: day.path,
					sourcePath: this.ctx.sourcePath,
					cls: CLS.day,
				});
				setTooltip(link, day.date.format('LL'));
			}
		}
		if (!filter) this.bodyEl.createDiv({ cls: CLS.muted, text: t('summary.total', { days: daysText(days) }) });
	}

	private title(range: Range): string {
		const current = inRange(moment(), range);
		if (this.options.period === 'week') {
			const span = t('summary.range', { start: range.start.format('D MMM'), end: range.end.format('D MMM YYYY') });
			return current ? t('summary.thisWeek', { range: span }) : span;
		}
		const month = t('summary.month', { month: range.start.format('MMMM'), year: range.start.format('YYYY') });
		return current ? t('summary.thisMonth', { month }) : capitalize(month);
	}
}

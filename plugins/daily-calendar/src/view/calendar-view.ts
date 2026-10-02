import { ItemView, debounce, moment, setIcon, setTooltip } from 'obsidian';
import type { IconName, WorkspaceLeaf } from 'obsidian';
import { capitalize, monthGrid, weekdayHeaders } from '../calendar/grid';
import type { GridDay } from '../calendar/grid';
import { CLOCK_INTERVAL_MS, CLS, DAY_FORMAT, ICON, REFRESH_DEBOUNCE_MS, STATE, VIEW_TYPE } from '../constants';
import { openDay } from '../daily/open';
import type { CalendarHost } from '../host';
import { t } from '../i18n';
import { emptyMarks, marksSignature } from '../index/marks';
import type { DayMarks } from '../index/marks';
import { collectDays } from '../index/month-index';
import { dayParts, renderDayMarks, renderLegend } from './day-cell';
import { DayPopover } from './day-popover';
import { bindGridEvents } from './grid-events';

interface Parts {
	title: HTMLElement;
	weekdays: HTMLElement;
	grid: HTMLElement;
	legend: HTMLElement;
}

/** A month of daily notes in the sidebar. */
export class CalendarView extends ItemView {
	private month: moment.Moment = moment().startOf('month');
	private today = moment().format(DAY_FORMAT);
	/** Day of the daily note in the active tab, if it is one. */
	private active: string | null = null;
	private parts: Parts | null = null;
	private marks = new Map<string, DayMarks>();
	/** What is on screen: month, settings and marks. Unchanged = no redraw. */
	private drawn = '';
	private readonly reloadSoon = debounce(() => void this.reload(), REFRESH_DEBOUNCE_MS, true);
	private readonly popover = new DayPopover(this.app, (key) => this.marks.get(key));

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: CalendarHost,
	) {
		super(leaf);
		this.navigation = false;
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	getDisplayText(): string {
		return t('view.title');
	}

	getIcon(): IconName {
		return ICON;
	}

	async onOpen(): Promise<void> {
		this.parts = this.build();
		const { workspace, metadataCache, vault } = this.app;
		this.registerEvent(workspace.on('file-open', () => this.follow()));
		this.registerEvent(workspace.on('active-leaf-change', () => this.follow()));
		// Any of these may change a mark. Bursts (startup, sync) end in one rebuild.
		this.registerEvent(metadataCache.on('changed', () => this.reloadSoon()));
		this.registerEvent(metadataCache.on('resolved', () => this.reloadSoon()));
		this.registerEvent(vault.on('create', () => this.reloadSoon()));
		this.registerEvent(vault.on('delete', () => this.reloadSoon()));
		this.registerEvent(vault.on('rename', () => this.reloadSoon()));
		this.registerInterval(window.setInterval(() => this.tick(), CLOCK_INTERVAL_MS));
		// The list is placed for the scroll position it opened at.
		this.registerDomEvent(this.contentEl, 'scroll', () => this.popover.hide(), { capture: true });
		// Closing the view or unloading the plugin never leaves the list on screen.
		this.register(() => this.popover.hide());
		this.update();
		await this.reload();
	}

	onClose(): Promise<void> {
		this.reloadSoon.cancel();
		this.parts = null;
		return Promise.resolve();
	}

	/** The settings changed: redraw with them. */
	refresh(): void {
		this.update();
	}

	showMonth(date: moment.Moment): void {
		this.month = date.clone().startOf('month');
		this.update();
	}

	private step(months: number): void {
		this.showMonth(this.month.clone().add(months, 'months'));
	}

	/** Read the Daily notes settings again (they live in a file the vault events do not cover), then update. */
	private async reload(): Promise<void> {
		await this.plugin.daily.refresh();
		if (!this.parts) return;
		// The active note may have been renamed, or the daily note format changed.
		this.follow();
		this.update();
	}

	/** Collect the marks of the days on screen; redraw only when something changed. */
	private update(): void {
		const parts = this.parts;
		if (!parts) return;
		const { settings } = this.plugin;
		const days = monthGrid(this.month, settings.weekStart);
		this.marks = collectDays(this.app, new Set(days.map((day) => day.key)), this.plugin.daily, settings);
		const drawn = JSON.stringify([
			this.month.format(DAY_FORMAT),
			this.today,
			moment.locale(),
			settings,
			marksSignature(this.marks),
		]);
		if (drawn === this.drawn) return;
		this.drawn = drawn;
		this.render(parts, days);
	}

	private build(): Parts {
		const root = this.contentEl;
		root.empty();
		root.addClass(CLS.view);
		const header = root.createDiv({ cls: CLS.header });
		const title = header.createDiv({ cls: CLS.title, attr: { 'aria-live': 'polite' } });
		const nav = header.createDiv({ cls: CLS.nav });
		this.navButton(nav, 'chevron-left', t('view.previous'), () => this.step(-1));
		const today = nav.createEl('button', { cls: CLS.todayButton, text: t('view.today') });
		today.addEventListener('click', () => this.showMonth(moment()));
		this.navButton(nav, 'chevron-right', t('view.next'), () => this.step(1));
		const weekdays = root.createDiv({ cls: [CLS.grid, CLS.weekdays], attr: { 'aria-hidden': 'true' } });
		const grid = root.createDiv({ cls: CLS.grid });
		bindGridEvents(grid, this.popover, (key, openIn) => void openDay(this.plugin, moment(key, DAY_FORMAT, true), openIn));
		const legend = root.createDiv({ cls: CLS.legend, attr: { 'aria-hidden': 'true' } });
		return { title, weekdays, grid, legend };
	}

	private navButton(parent: HTMLElement, icon: IconName, label: string, onClick: () => void): void {
		const button = parent.createEl('button', { cls: ['clickable-icon', CLS.navButton] });
		setIcon(button, icon);
		setTooltip(button, label);
		button.addEventListener('click', onClick);
	}

	private render(parts: Parts, days: GridDay[]): void {
		const { weekStart, highlightWeekends } = this.plugin.settings;
		const locale = moment.locale();
		// The cell it points to is about to go.
		this.popover.hide();
		parts.title.setText(
			t('view.month', { month: capitalize(this.month.format('MMMM'), locale), year: this.month.format('YYYY') }),
		);
		this.contentEl.toggleClass(STATE.highlightWeekends, highlightWeekends);
		parts.weekdays.empty();
		for (const header of weekdayHeaders(moment.weekdaysShort(), weekStart)) {
			const cell = parts.weekdays.createDiv({ cls: CLS.weekday, text: capitalize(header.label, locale) });
			cell.toggleClass(STATE.weekend, header.weekend);
		}
		parts.grid.empty();
		for (const day of days) this.renderDay(parts.grid, day, locale);
		renderLegend(parts.legend, this.plugin.settings);
	}

	private renderDay(grid: HTMLElement, day: GridDay, locale: string): void {
		const marks = this.marks.get(day.key) ?? emptyMarks();
		const cell = grid.createEl('button', { cls: CLS.day, attr: { 'data-day': day.key } });
		cell.toggleClass(STATE.otherMonth, !day.inMonth);
		cell.toggleClass(STATE.weekend, day.weekend);
		cell.toggleClass(STATE.today, day.key === this.today);
		cell.toggleClass(STATE.active, day.key === this.active);
		if (day.key === this.today) cell.setAttr('aria-current', 'date');
		cell.createSpan({ cls: CLS.number, text: String(day.date.date()), attr: { 'aria-hidden': 'true' } });
		renderDayMarks(cell, marks);
		// Text for screen readers instead of aria-label: Obsidian shows aria-labels as tooltips.
		const date = capitalize(day.date.format('dddd, LL'), locale);
		const parts = dayParts(marks);
		cell.createSpan({
			cls: CLS.srOnly,
			text: parts.length > 0 ? t('day.summary', { date, items: parts.join(', ') }) : date,
		});
	}

	/** Highlight the day of the active note when it is a daily note. */
	private follow(): void {
		const file = this.app.workspace.getActiveFile();
		const key = file ? this.plugin.daily.keyOf(file.path) : null;
		if (key === this.active) return;
		this.active = key;
		this.parts?.grid.querySelectorAll<HTMLElement>(`.${CLS.day}`).forEach((cell) => {
			cell.toggleClass(STATE.active, cell.dataset.day === key);
		});
	}

	/** Midnight: move the "today" highlight. */
	private tick(): void {
		const today = moment().format(DAY_FORMAT);
		if (today === this.today) return;
		this.today = today;
		this.update();
	}
}

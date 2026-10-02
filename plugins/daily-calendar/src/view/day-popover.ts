import { Keymap, moment } from 'obsidian';
import type { App } from 'obsidian';
import { capitalize } from '../calendar/grid';
import { CLS, DAY_FORMAT, POPOVER } from '../constants';
import { openNote } from '../daily/open';
import type { OpenIn } from '../daily/open';
import { t } from '../i18n';
import { hasMarks } from '../index/marks';
import type { DayMarks, NoteItem } from '../index/marks';
import type { ProjectItem } from '../index/values';
import type { SourceId } from '../types';

/** Gap between the day and the list, and the margin kept from the window edges (px). */
const GAP = 4;
const MARGIN = 8;

let popoverId = 0;

/**
 * The list of what a day has, next to it: on hover for a mouse (after a
 * delay), on a long press for touch. Hides when the pointer leaves the day
 * and the list, on Esc, on a click outside, or when the view redraws.
 * Listeners on the document live only while the list is open.
 */
export class DayPopover {
	private el: HTMLElement | null = null;
	private cell: HTMLElement | null = null;
	private showTimer = 0;
	private hideTimer = 0;
	private readonly onKey = (evt: KeyboardEvent) => {
		if (evt.key === 'Escape') this.hide();
	};
	private readonly onPointerDown = (evt: PointerEvent) => {
		const target = evt.target instanceof Node ? evt.target : null;
		if (target && (this.el?.contains(target) || this.cell?.contains(target))) return;
		this.hide();
	};

	constructor(
		private readonly app: App,
		private readonly marksOf: (key: string) => DayMarks | undefined,
	) {}

	get openCell(): HTMLElement | null {
		return this.el ? this.cell : null;
	}

	/** The mouse entered a day. */
	hoverIn(cell: HTMLElement): void {
		window.clearTimeout(this.hideTimer);
		if (this.el && this.cell === cell) return;
		window.clearTimeout(this.showTimer);
		// Moving between days with the list open switches right away.
		if (this.el) {
			this.show(cell);
			return;
		}
		this.showTimer = window.setTimeout(() => this.show(cell), POPOVER.hoverDelayMs);
	}

	/** The mouse left a day or the list: hide unless it comes back soon. */
	hoverOut(): void {
		window.clearTimeout(this.showTimer);
		window.clearTimeout(this.hideTimer);
		this.hideTimer = window.setTimeout(() => this.hide(), POPOVER.hideDelayMs);
	}

	/** Show the list of a day now. Returns false when the day has nothing to list. */
	show(cell: HTMLElement): boolean {
		window.clearTimeout(this.showTimer);
		window.clearTimeout(this.hideTimer);
		const key = cell.dataset.day;
		const marks = key ? this.marksOf(key) : undefined;
		if (!key || !marks || !hasMarks(marks) || !cell.isConnected) {
			this.hide();
			return false;
		}
		this.hide();
		this.cell = cell;
		const doc = cell.doc;
		const el = doc.body.createDiv({ cls: CLS.popover, attr: { role: 'dialog' } });
		this.el = el;
		this.fill(el, moment(key, DAY_FORMAT, true), marks);
		el.addEventListener('pointerenter', (evt) => {
			if (evt.pointerType === 'mouse') window.clearTimeout(this.hideTimer);
		});
		el.addEventListener('pointerleave', (evt) => {
			if (evt.pointerType === 'mouse') this.hoverOut();
		});
		this.place(el, cell);
		doc.addEventListener('keydown', this.onKey, true);
		doc.addEventListener('pointerdown', this.onPointerDown, true);
		return true;
	}

	hide(): void {
		window.clearTimeout(this.showTimer);
		window.clearTimeout(this.hideTimer);
		if (!this.el) return;
		const doc = this.el.doc;
		doc.removeEventListener('keydown', this.onKey, true);
		doc.removeEventListener('pointerdown', this.onPointerDown, true);
		this.el.remove();
		this.el = null;
		this.cell = null;
	}

	private fill(el: HTMLElement, date: moment.Moment, marks: DayMarks): void {
		const titleId = `dcal-popover-${++popoverId}`;
		el.setAttr('aria-labelledby', titleId);
		el.createDiv({ cls: CLS.popoverTitle, text: capitalize(date.format('dddd, LL'), moment.locale()), attr: { id: titleId } });
		if (marks.daily) this.section(el, 'daily', [marks.daily]);
		if (marks.projects.length > 0) this.section(el, 'projects', marks.projects);
		if (marks.meetings.length > 0) this.section(el, 'meetings', marks.meetings);
		if (marks.cards.length > 0) this.section(el, 'cards', marks.cards);
		if (marks.catalog.length > 0) this.section(el, 'catalog', marks.catalog);
	}

	private section(parent: HTMLElement, source: SourceId, items: readonly (NoteItem | ProjectItem)[]): void {
		const section = parent.createDiv({ cls: CLS.popoverSection });
		const heading = section.createDiv({ cls: CLS.popoverHeading });
		if (source === 'projects') heading.createSpan({ cls: CLS.legendCount, text: String(items.length) });
		else heading.createSpan({ cls: [CLS.dot, `${CLS.dot}-${source}`] });
		heading.createSpan({ text: t(`popover.${source}`) });
		if (source !== 'projects' && items.length > 1) heading.createSpan({ cls: CLS.popoverCount, text: String(items.length) });
		const list = section.createEl('ul', { cls: CLS.popoverList });
		for (const item of items) {
			const row = list.createEl('li');
			if (item.path) this.link(row, item.title, item.path);
			else row.createSpan({ cls: CLS.popoverText, text: item.title });
		}
	}

	private link(parent: HTMLElement, text: string, path: string): void {
		const link = parent.createEl('a', { cls: CLS.popoverLink, text, href: '#' });
		const open = (evt: MouseEvent, openIn: OpenIn) => {
			evt.preventDefault();
			const file = this.app.vault.getFileByPath(path);
			this.hide();
			if (file) void openNote(this.app, file, openIn);
		};
		link.addEventListener('click', (evt) => open(evt, Keymap.isModEvent(evt)));
		link.addEventListener('auxclick', (evt) => {
			if (evt.button === 1) open(evt, 'tab');
		});
	}

	/** Below the day, or above it when it does not fit; always inside the window. */
	private place(el: HTMLElement, cell: HTMLElement): void {
		const win = cell.win;
		const day = cell.getBoundingClientRect();
		const box = el.getBoundingClientRect();
		const maxLeft = win.innerWidth - box.width - MARGIN;
		const left = Math.max(MARGIN, Math.min(day.left + day.width / 2 - box.width / 2, maxLeft));
		let top = day.bottom + GAP;
		if (top + box.height > win.innerHeight - MARGIN) top = Math.max(MARGIN, day.top - GAP - box.height);
		el.setCssStyles({ left: `${Math.round(left)}px`, top: `${Math.round(top)}px` });
	}
}

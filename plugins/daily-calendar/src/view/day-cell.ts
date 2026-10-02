import { CLS } from '../constants';
import { plural, t } from '../i18n';
import type { DayMarks } from '../index/marks';
import { SOURCES } from '../types';
import type { DailyCalendarSettings, SourceId } from '../types';

/** Sources drawn as dots, in order; projects are a number in the corner instead. */
const DOT_SOURCES = ['daily', 'meetings', 'cards', 'catalog'] as const satisfies readonly SourceId[];

function dotClass(source: SourceId): string {
	return `${CLS.dot}-${source}`;
}

function present(marks: DayMarks, source: (typeof DOT_SOURCES)[number]): boolean {
	return source === 'daily' ? marks.daily !== null : marks[source].length > 0;
}

/**
 * The markers of a day: the number of projects in the corner and one dot per
 * source with something on the day. The dot row always exists, so cells line up.
 */
export function renderDayMarks(cell: HTMLElement, marks: DayMarks): void {
	if (marks.projects.length > 0) {
		cell.createSpan({ cls: CLS.count, text: String(marks.projects.length), attr: { 'aria-hidden': 'true' } });
	}
	const dots = cell.createDiv({ cls: CLS.dots, attr: { 'aria-hidden': 'true' } });
	for (const source of DOT_SOURCES) {
		if (present(marks, source)) dots.createSpan({ cls: [CLS.dot, dotClass(source)] });
	}
}

/** What a day has, in words, for screen readers. */
export function dayParts(marks: DayMarks): string[] {
	const parts: string[] = [];
	if (marks.daily) parts.push(t('day.daily'));
	if (marks.projects.length > 0) parts.push(plural('day.projects', marks.projects.length));
	if (marks.meetings.length > 0) parts.push(plural('day.meetings', marks.meetings.length));
	if (marks.cards.length > 0) parts.push(plural('day.cards', marks.cards.length));
	if (marks.catalog.length > 0) parts.push(plural('day.catalog', marks.catalog.length));
	return parts;
}

/** The key under the grid: the sources that are on. The projects sample is a digit, like the corner number. */
export function renderLegend(parent: HTMLElement, settings: DailyCalendarSettings): void {
	parent.empty();
	for (const source of SOURCES) {
		if (!settings.sources[source]) continue;
		const item = parent.createDiv({ cls: CLS.legendItem });
		if (source === 'projects') item.createSpan({ cls: CLS.legendCount, text: '2' });
		else item.createSpan({ cls: [CLS.dot, dotClass(source)] });
		item.createSpan({ text: t(`legend.${source}`) });
	}
	parent.toggleClass(CLS.hidden, parent.childElementCount === 0);
}

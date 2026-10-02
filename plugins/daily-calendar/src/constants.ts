/** View type id: stable API (workspaces save it), never rename. */
export const VIEW_TYPE = 'daily-calendar';
export const ICON = 'calendar-days';

export const SAVE_DEBOUNCE_MS = 400;
/** How often the view checks whether the day changed (midnight). */
export const CLOCK_INTERVAL_MS = 60_000;
/** The marks are rebuilt at most this often while the vault changes. */
export const REFRESH_DEBOUNCE_MS = 300;

/** The list of a day: hover delay, grace time to move into it, long press on touch (ms, px). */
export const POPOVER = {
	hoverDelayMs: 350,
	hideDelayMs: 200,
	longPressMs: 500,
	longPressMovePx: 10,
} as const;

/** Key of a day in the index and in the DOM. Data, never translated. */
export const DAY_FORMAT = 'YYYY-MM-DD';

export const CLS = {
	view: 'dcal-view',
	header: 'dcal-header',
	title: 'dcal-title',
	nav: 'dcal-nav',
	navButton: 'dcal-nav-button',
	todayButton: 'dcal-today-button',
	grid: 'dcal-grid',
	weekdays: 'dcal-weekdays',
	weekday: 'dcal-weekday',
	day: 'dcal-day',
	number: 'dcal-number',
	srOnly: 'dcal-sr-only',
	dots: 'dcal-dots',
	dot: 'dcal-dot',
	count: 'dcal-count',
	legend: 'dcal-legend',
	legendItem: 'dcal-legend-item',
	legendCount: 'dcal-legend-count',
	hidden: 'dcal-hidden',
	popover: 'dcal-popover',
	popoverTitle: 'dcal-popover-title',
	popoverSection: 'dcal-popover-section',
	popoverHeading: 'dcal-popover-heading',
	popoverCount: 'dcal-popover-count',
	popoverList: 'dcal-popover-list',
	popoverLink: 'dcal-popover-link',
	popoverText: 'dcal-popover-text',
} as const;

/** State classes of a day cell. */
export const STATE = {
	today: 'is-today',
	active: 'is-active',
	weekend: 'is-weekend',
	otherMonth: 'is-other-month',
	highlightWeekends: 'dcal-highlight-weekends',
} as const;

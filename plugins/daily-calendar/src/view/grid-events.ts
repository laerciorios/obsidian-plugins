import { Keymap } from 'obsidian';
import { CLS, POPOVER } from '../constants';
import type { OpenIn } from '../daily/open';
import type { DayPopover } from './day-popover';

function cellOf(target: EventTarget | null): HTMLElement | null {
	return target instanceof Element ? target.closest<HTMLElement>(`.${CLS.day}`) : null;
}

/**
 * Pointer handling of the day cells, delegated to the grid (the cells are
 * redrawn): click opens the daily note, the mouse hovers the list in, a long
 * press shows it on touch screens without opening anything.
 */
export function bindGridEvents(grid: HTMLElement, popover: DayPopover, open: (key: string, openIn: OpenIn) => void): void {
	let pressTimer = 0;
	let pressStart: { x: number; y: number } | null = null;
	/** A long press happened: the click that follows must not open the day. */
	let swallowClick = false;

	const cancelPress = () => {
		window.clearTimeout(pressTimer);
		pressStart = null;
	};

	const click = (evt: MouseEvent, openIn: OpenIn) => {
		const key = cellOf(evt.target)?.dataset.day;
		if (!key) return;
		evt.preventDefault();
		if (swallowClick) {
			swallowClick = false;
			return;
		}
		popover.hide();
		open(key, openIn);
	};
	grid.addEventListener('click', (evt) => click(evt, Keymap.isModEvent(evt)));
	grid.addEventListener('auxclick', (evt) => {
		if (evt.button === 1) click(evt, 'tab');
	});

	grid.addEventListener('pointerover', (evt) => {
		if (evt.pointerType !== 'mouse') return;
		const cell = cellOf(evt.target);
		if (cell) popover.hoverIn(cell);
	});
	grid.addEventListener('pointerout', (evt) => {
		if (evt.pointerType !== 'mouse') return;
		const from = cellOf(evt.target);
		if (from && from !== cellOf(evt.relatedTarget)) popover.hoverOut();
	});

	grid.addEventListener('pointerdown', (evt) => {
		swallowClick = false;
		if (evt.pointerType === 'mouse') return;
		const cell = cellOf(evt.target);
		if (!cell) return;
		cancelPress();
		pressStart = { x: evt.clientX, y: evt.clientY };
		pressTimer = window.setTimeout(() => {
			pressStart = null;
			// A long press never opens or creates the daily note, even on a day with nothing to list.
			swallowClick = true;
			popover.show(cell);
		}, POPOVER.longPressMs);
	});
	grid.addEventListener('pointermove', (evt) => {
		if (!pressStart) return;
		if (Math.hypot(evt.clientX - pressStart.x, evt.clientY - pressStart.y) > POPOVER.longPressMovePx) cancelPress();
	});
	grid.addEventListener('pointerup', cancelPress);
	grid.addEventListener('pointercancel', cancelPress);
	// Some touch browsers turn the long press into a context menu (and cancel the
	// pointer) before the timer: show the list right there instead of the system menu.
	grid.addEventListener('contextmenu', (evt) => {
		if (!pressStart && !swallowClick) return;
		evt.preventDefault();
		const cell = cellOf(evt.target);
		if (pressStart && cell) {
			swallowClick = true;
			popover.show(cell);
		}
		cancelPress();
	});
}

import { CLS } from '../constants';

let nextListId = 0;

export interface OptionListSpec<T> {
	items: readonly T[];
	/** Index to select first (clamped); -1 selects the first item. */
	selected: number;
	label: string;
	/** `grid`: poster tiles laid out in rows (seasons). */
	layout?: 'list' | 'grid';
	render(item: T, el: HTMLElement): void;
	/** The highlighted item changed (arrows or mouse). */
	onSelect(index: number): void;
	/** The user chose an item (click or Enter). */
	onPick(index: number): void;
}

/**
 * A listbox of cards driven by the modal scope: the focus stays where it is
 * (the search input), the arrows move the highlight and Enter picks it.
 * Nothing is ever picked without a click or a key press.
 */
export class OptionList<T> {
	readonly el: HTMLElement;
	private readonly options: HTMLElement[] = [];
	private readonly idBase = `mc-options-${nextListId++}`;
	private current = -1;

	constructor(
		parent: HTMLElement,
		private readonly spec: OptionListSpec<T>,
	) {
		this.el = parent.createDiv({
			cls: CLS.results,
			attr: { id: this.idBase, role: 'listbox', 'aria-label': spec.label, 'data-layout': spec.layout ?? 'list' },
		});
		spec.items.forEach((item, index) => {
			const option = this.el.createDiv({
				cls: CLS.result,
				attr: { id: `${this.idBase}-${index}`, role: 'option', 'aria-selected': 'false' },
			});
			spec.render(item, option);
			option.addEventListener('click', () => spec.onPick(index));
			option.addEventListener('mousemove', () => {
				if (index !== this.current) this.select(index, false);
			});
			this.options.push(option);
		});
		this.select(Math.max(spec.selected, 0), true);
	}

	/** Id of the highlighted option, for aria-activedescendant. */
	get activeId(): string | null {
		return this.current >= 0 ? `${this.idBase}-${this.current}` : null;
	}

	select(index: number, scroll = true): void {
		const count = this.options.length;
		if (count === 0) return;
		const next = Math.min(Math.max(index, 0), count - 1);
		const previous = this.options[this.current];
		previous?.removeClass(CLS.selected);
		previous?.setAttr('aria-selected', 'false');

		this.current = next;
		const option = this.options[next];
		option?.addClass(CLS.selected);
		option?.setAttr('aria-selected', 'true');
		this.el.setAttr('aria-activedescendant', `${this.idBase}-${next}`);
		if (scroll) option?.scrollIntoView({ block: 'nearest' });
		this.spec.onSelect(next);
	}

	/** Move by `delta` items, wrapping around like Obsidian's suggesters. False when empty. */
	move(delta: number): boolean {
		const count = this.options.length;
		if (count === 0) return false;
		const from = this.current < 0 ? (delta > 0 ? -1 : count) : this.current;
		this.select((((from + delta) % count) + count) % count);
		return true;
	}

	/** Grid layout: move one row up (-1) or down (1). Stays put on the first/last row. */
	moveRow(direction: -1 | 1): boolean {
		const count = this.options.length;
		if (count === 0) return false;
		const columns = this.columns();
		const row = Math.floor(this.current / columns);
		const lastRow = Math.floor((count - 1) / columns);
		if ((direction < 0 && row === 0) || (direction > 0 && row === lastRow)) return true;
		this.select(Math.min(this.current + direction * columns, count - 1));
		return true;
	}

	pick(): boolean {
		if (this.current < 0) return false;
		this.spec.onPick(this.current);
		return true;
	}

	/** Items on the first row (1 in list layout). */
	private columns(): number {
		const top = this.options[0]?.offsetTop;
		if (top === undefined) return 1;
		return Math.max(1, this.options.filter((option) => option.offsetTop === top).length);
	}
}

import { CLS } from '../constants';
import type { Column } from '../types';

export interface ColumnEls {
	columnEl: HTMLElement;
	bodyEl: HTMLElement;
}

/** "+ Add card" button at the foot of a column; clicks are handled by the board root. */
export function addCardButton(columnEl: HTMLElement, label: string): void {
	const footer = columnEl.createDiv({ cls: CLS.columnFooter });
	footer.createEl('button', { cls: CLS.addCard, text: label, attr: { type: 'button' } });
}

/** Column shell: header (label + count) and a body that receives cards. */
export function createColumnEl(parent: HTMLElement, column: Column): ColumnEls {
	const columnEl = parent.createDiv({ cls: CLS.column });
	columnEl.dataset.key = column.key;
	columnEl.dataset.accepts = column.isOther ? 'false' : 'true';
	columnEl.toggleClass(CLS.columnDone, column.isDone);
	columnEl.toggleClass(CLS.columnOther, column.isOther);
	if (column.isDone) columnEl.dataset.done = 'true';

	const header = columnEl.createDiv({ cls: CLS.columnHeader });
	header.createSpan({ cls: CLS.columnTitle, text: column.label });
	header.createSpan({ cls: CLS.count, text: String(column.entries.length) });

	const bodyEl = columnEl.createDiv({ cls: CLS.columnBody });
	return { columnEl, bodyEl };
}

/** Recount the cards currently in a column (used after an optimistic move). */
export function refreshCount(columnEl: HTMLElement): void {
	const count = columnEl.querySelectorAll(`.${CLS.card}`).length;
	const countEl = columnEl.querySelector(`.${CLS.count}`);
	if (countEl) countEl.textContent = String(count);
}

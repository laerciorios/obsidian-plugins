import { CLS } from '../constants';
import { todayIso } from '../data/values';
import type { CardModel } from '../types';

const TYPE_CLASS_SAFE = /[^a-z0-9-]/g;

function typeClass(type: string): string {
	return `bb-type-${type.toLowerCase().replace(TYPE_CLASS_SAFE, '-')}`;
}

/**
 * Card element. Interaction (click, hover, drag) is handled by delegated
 * listeners on the board root, keyed by data attributes set here.
 */
export function createCardEl(parent: HTMLElement, card: CardModel): HTMLElement {
	const cardEl = parent.createDiv({ cls: CLS.card });
	cardEl.dataset.path = card.path;
	cardEl.draggable = card.draggable;
	cardEl.toggleClass(CLS.cardLocked, !card.draggable);
	if (card.type) cardEl.addClass(typeClass(card.type));

	cardEl.createDiv({ cls: CLS.cardTitle, text: card.title });

	const meta = cardEl.createDiv({ cls: CLS.cardMeta });

	if (card.type) {
		meta.createSpan({ cls: [CLS.badge, typeClass(card.type)], text: card.type });
	}

	if (card.project) {
		const chip = meta.createSpan({ cls: [CLS.chip, CLS.chipProject], text: card.project.label });
		if (card.project.linkpath) {
			chip.dataset.linkpath = card.project.linkpath;
			chip.setAttr('aria-label', `Abrir ${card.project.label}`);
		}
	}

	if (card.isAi) {
		meta.createSpan({ cls: [CLS.chip, CLS.chipAi], text: 'AI' });
	}

	if (card.due) {
		const dueEl = meta.createSpan({ cls: CLS.due, text: card.due });
		dueEl.dataset.due = card.due;
		dueEl.toggleClass(CLS.dueOverdue, card.isOverdue);
		dueEl.setAttr('aria-label', card.isOverdue ? `Prazo vencido: ${card.due}` : `Prazo: ${card.due}`);
	}

	if (meta.childElementCount === 0) meta.remove();
	return cardEl;
}

/** Recompute the overdue flag after a card changes column without a re-render. */
export function refreshOverdue(cardEl: HTMLElement, inDoneColumn: boolean): void {
	const dueEl = cardEl.querySelector<HTMLElement>(`.${CLS.due}`);
	const due = dueEl?.dataset.due;
	if (!dueEl || !due) return;
	dueEl.toggleClass(CLS.dueOverdue, due < todayIso() && !inDoneColumn);
}

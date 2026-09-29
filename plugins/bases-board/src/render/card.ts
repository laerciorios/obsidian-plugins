import { CLS } from '../constants';
import { todayIso } from '../data/values';
import { t } from '../i18n';
import type { CardModel } from '../types';
import { blockedMark, parentChip, relationBlocks } from './relations';
import type { ExpandedState } from './relations';

const TYPE_CLASS_SAFE = /[^a-z0-9-]/g;

function typeClass(type: string): string {
	return `bb-type-${type.toLowerCase().replace(TYPE_CLASS_SAFE, '-')}`;
}

/**
 * Card element. Interaction (click, hover, drag) is handled by delegated
 * listeners on the board root, keyed by data attributes set here.
 */
export function createCardEl(parent: HTMLElement, card: CardModel, expanded: ExpandedState = () => undefined): HTMLElement {
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

	const relations = card.relations;
	if (relations?.parent) parentChip(meta, relations.parent);
	if (relations && relations.blockers.length > 0) {
		blockedMark(meta, relations.blockers);
		cardEl.addClass('bb-card-blocked');
	}

	if (card.project) {
		const chip = meta.createSpan({ cls: [CLS.chip, CLS.chipProject], text: card.project.label });
		if (card.project.linkpath) {
			chip.dataset.linkpath = card.project.linkpath;
			chip.setAttr('aria-label', t('card.openProject', { name: card.project.label }));
		}
	}

	if (card.isAi) {
		meta.createSpan({ cls: [CLS.chip, CLS.chipAi], text: t('card.ai') });
	}

	if (card.due) {
		const dueEl = meta.createSpan({ cls: CLS.due, text: card.due });
		dueEl.dataset.due = card.due;
		dueEl.toggleClass(CLS.dueOverdue, card.isOverdue);
		dueEl.setAttr('aria-label', t(card.isOverdue ? 'card.overdue' : 'card.due', { date: card.due }));
	}

	if (meta.childElementCount === 0) meta.remove();
	if (relations) relationBlocks(cardEl, card.path, relations, expanded);
	return cardEl;
}

/** Recompute the overdue flag after a card changes column without a re-render. */
export function refreshOverdue(cardEl: HTMLElement, inDoneColumn: boolean): void {
	const dueEl = cardEl.querySelector<HTMLElement>(`.${CLS.due}`);
	const due = dueEl?.dataset.due;
	if (!dueEl || !due) return;
	dueEl.toggleClass(CLS.dueOverdue, due < todayIso() && !inDoneColumn);
}

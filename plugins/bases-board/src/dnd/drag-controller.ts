import type { Component } from 'obsidian';
import { CLS } from '../constants';

export interface DropEvent {
	path: string;
	cardEl: HTMLElement;
	fromKey: string;
	toKey: string;
	toColumnEl: HTMLElement;
}

export interface DragHandlers {
	onDrop(event: DropEvent): void;
	/** Called when a drag ends (dropped or cancelled). */
	onDragEnd(): void;
}

interface DragState {
	path: string;
	cardEl: HTMLElement;
	fromKey: string;
}

/**
 * Native HTML5 drag and drop, wired once with delegated listeners on the board
 * root. The root survives re-renders, so no listener is ever leaked per card.
 */
export class DragController {
	private state: DragState | null = null;
	private dropTarget: HTMLElement | null = null;

	constructor(
		private readonly rootEl: HTMLElement,
		private readonly handlers: DragHandlers,
	) {}

	get isDragging(): boolean {
		return this.state !== null;
	}

	register(component: Component): void {
		const root = this.rootEl;
		component.registerDomEvent(root, 'dragstart', (evt) => this.onDragStart(evt));
		component.registerDomEvent(root, 'dragover', (evt) => this.onDragOver(evt));
		component.registerDomEvent(root, 'dragleave', (evt) => this.onDragLeave(evt));
		component.registerDomEvent(root, 'drop', (evt) => this.onDropEvt(evt));
		component.registerDomEvent(root, 'dragend', () => this.finish());
	}

	private onDragStart(evt: DragEvent): void {
		const cardEl = (evt.target as HTMLElement | null)?.closest<HTMLElement>(`.${CLS.card}`);
		const columnEl = cardEl?.closest<HTMLElement>(`.${CLS.column}`);
		const path = cardEl?.dataset.path;
		const fromKey = columnEl?.dataset.key;
		if (!cardEl || !cardEl.draggable || !path || fromKey === undefined) return;

		this.state = { path, cardEl, fromKey };
		if (evt.dataTransfer) {
			evt.dataTransfer.effectAllowed = 'move';
			evt.dataTransfer.setData('text/plain', path);
		}
		cardEl.addClass(CLS.cardDragging);
		this.rootEl.addClass(CLS.dragging);
	}

	private columnAt(evt: DragEvent): HTMLElement | null {
		const columnEl = (evt.target as HTMLElement | null)?.closest<HTMLElement>(`.${CLS.column}`) ?? null;
		return columnEl?.dataset.accepts === 'true' ? columnEl : null;
	}

	private onDragOver(evt: DragEvent): void {
		if (!this.state) return;
		const columnEl = this.columnAt(evt);
		if (!columnEl) {
			this.setDropTarget(null);
			return;
		}
		evt.preventDefault();
		if (evt.dataTransfer) evt.dataTransfer.dropEffect = 'move';
		this.setDropTarget(columnEl);
	}

	private onDragLeave(evt: DragEvent): void {
		const next = evt.relatedTarget as Node | null;
		if (!next || !this.rootEl.contains(next)) this.setDropTarget(null);
	}

	private onDropEvt(evt: DragEvent): void {
		const state = this.state;
		const columnEl = this.columnAt(evt);
		if (!state || !columnEl) return;
		evt.preventDefault();

		// Drop first (the optimistic move and pending state are set synchronously),
		// then finish: finishing may flush a render that was deferred during the drag.
		const toKey = columnEl.dataset.key;
		if (toKey !== undefined && toKey !== state.fromKey) {
			this.handlers.onDrop({ path: state.path, cardEl: state.cardEl, fromKey: state.fromKey, toKey, toColumnEl: columnEl });
		}
		this.finish();
	}

	private setDropTarget(columnEl: HTMLElement | null): void {
		if (this.dropTarget === columnEl) return;
		this.dropTarget?.removeClass(CLS.dropTarget);
		columnEl?.addClass(CLS.dropTarget);
		this.dropTarget = columnEl;
	}

	private finish(): void {
		if (!this.state) return;
		this.state.cardEl.removeClass(CLS.cardDragging);
		this.rootEl.removeClass(CLS.dragging);
		this.setDropTarget(null);
		this.state = null;
		this.handlers.onDragEnd();
	}
}

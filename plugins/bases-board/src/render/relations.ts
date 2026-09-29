import { setIcon, setTooltip } from 'obsidian';
import { CLS } from '../constants';
import type { CardRelations, Progress, RelationList, RelationRow } from '../hierarchy/relations';
import { t } from '../i18n';

/** Kind of list, for its toggle label: children of a spec, or specs of a project. */
export type ListKind = 'tasks' | 'specs';

/** Whether the list of a card is open: the user's last choice, else the default. */
export type ExpandedState = (cardPath: string, kind: ListKind) => boolean | undefined;

const STATUS_SAFE = /[^a-z0-9-]+/g;

/** Badge with the raw status value; color classes by value, plus one for "done". */
export function statusBadge(parent: HTMLElement, status: string, done: boolean): HTMLElement {
	const slug = status.toLowerCase().replace(STATUS_SAFE, '-');
	const el = parent.createSpan({ cls: [CLS.status, `bb-status-${slug || 'none'}`], text: status || '—' });
	el.toggleClass(CLS.statusDone, done);
	return el;
}

/** "↑ <parent title>" chip, opens the parent card. */
export function parentChip(meta: HTMLElement, parent: NonNullable<CardRelations['parent']>): void {
	const chip = meta.createSpan({ cls: [CLS.chip, CLS.chipParent], text: `↑ ${parent.title}` });
	chip.dataset.linkpath = parent.path;
	chip.dataset.hoverPath = parent.path;
	chip.setAttr('aria-label', t('card.openParent', { name: parent.title }));
}

/** Lock icon; the tooltip lists the blockers that are not done. */
export function blockedMark(meta: HTMLElement, blockers: string[]): void {
	const el = meta.createSpan({ cls: CLS.blocked });
	setIcon(el, 'lock');
	const text = t('card.blockedBy', { names: blockers.join(', ') });
	el.setAttr('aria-label', text);
	setTooltip(el, text);
}

function progressBar(parent: HTMLElement, progress: Progress): void {
	const el = parent.createDiv({ cls: CLS.progress });
	el.setAttr('role', 'progressbar');
	el.setAttr('aria-valuemin', '0');
	el.setAttr('aria-valuemax', String(progress.total));
	el.setAttr('aria-valuenow', String(progress.done));
	el.setAttr('aria-label', t('card.progress', { done: progress.done, total: progress.total }));
	const track = el.createDiv({ cls: CLS.progressTrack });
	const fill = track.createDiv({ cls: CLS.progressFill });
	const ratio = progress.total > 0 ? progress.done / progress.total : 0;
	fill.style.setProperty('--bb-progress', `${Math.round(ratio * 100)}%`);
	el.toggleClass(CLS.progressComplete, progress.total > 0 && progress.done === progress.total);
	el.createSpan({ cls: CLS.progressLabel, text: `${progress.done}/${progress.total}` });
}

function countLabel(kind: ListKind, count: number): string {
	if (kind === 'specs') return count === 1 ? t('card.specs.one') : t('card.specs.other', { count });
	return count === 1 ? t('card.tasks.one') : t('card.tasks.other', { count });
}

function rowEl(parent: HTMLElement, row: RelationRow): void {
	const el = parent.createDiv({ cls: CLS.child });
	el.dataset.linkpath = row.path;
	el.dataset.hoverPath = row.path;
	el.toggleClass(CLS.childArchived, row.archived);
	if (row.archived) el.setAttr('aria-label', t('card.archived'));
	statusBadge(el, row.status, row.done);
	el.createSpan({ cls: CLS.childTitle, text: row.title });
	if (row.progress) el.createSpan({ cls: CLS.childProgress, text: `${row.progress.done}/${row.progress.total}` });
}

/** Collapsible list; rows are always rendered, collapsing only hides them. */
function childList(parent: HTMLElement, cardPath: string, kind: ListKind, list: RelationList, expanded: ExpandedState): void {
	const open = expanded(cardPath, kind) ?? !list.collapsed;
	const el = parent.createDiv({ cls: CLS.childList });
	el.dataset.kind = kind;
	el.toggleClass(CLS.childListCollapsed, !open);
	const toggle = el.createEl('button', { cls: CLS.childToggle, attr: { type: 'button', 'aria-expanded': String(open) } });
	setIcon(toggle.createSpan({ cls: 'bb-child-toggle-icon' }), 'chevron-right');
	toggle.createSpan({ text: countLabel(kind, list.rows.length) });
	const rows = el.createDiv({ cls: CLS.childRows });
	for (const row of list.rows) rowEl(rows, row);
}

/** Open or close a list in place (no re-render). Returns the new state. */
export function toggleList(listEl: HTMLElement): boolean {
	const open = listEl.hasClass(CLS.childListCollapsed);
	listEl.toggleClass(CLS.childListCollapsed, !open);
	listEl.querySelector(`.${CLS.childToggle}`)?.setAttr('aria-expanded', String(open));
	return open;
}

/** Progress, project summary and child lists below the card meta. */
export function relationBlocks(cardEl: HTMLElement, cardPath: string, relations: CardRelations, expanded: ExpandedState): void {
	const { progress, children, project } = relations;
	if (!progress && !children && !project) return;
	const el = cardEl.createDiv({ cls: CLS.relations });

	if (progress) progressBar(el, progress);
	if (children) childList(el, cardPath, 'tasks', children, expanded);

	if (project) {
		if (project.progress) {
			el.createDiv({ cls: CLS.summary, text: `${countLabel('specs', project.specs)} · ${countLabel('tasks', project.tasks)}` });
			progressBar(el, project.progress);
		}
		if (project.list) childList(el, cardPath, 'specs', project.list, expanded);
	}
	if (el.childElementCount === 0) el.remove();
}

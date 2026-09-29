import { BasesView, Keymap, Notice, parsePropertyId } from 'obsidian';
import type { BasesEntry, BasesPropertyId, HoverParent, HoverPopover, QueryController } from 'obsidian';
import { collectProjects } from '../cards/new-card';
import { NewCardModal } from '../cards/new-card-modal';
import { formatCompleted } from '../data/dates';
import { folderOf } from '../patterns/pattern';
import { archiveMatcherOf, projectOf } from '../profiles/matcher';
import type { BoardSettings } from '../settings/model';
import { CLS, HOVER_SOURCE, OTHER_KEY, PENDING_SWEEP_MS, PENDING_TTL_MS, VIEW_TYPE } from '../constants';
import { toCardModel } from '../data/card-model';
import { t } from '../i18n';
import { groupIntoColumns } from '../data/columns';
import { completedActionFor, moveEntry } from '../data/frontmatter';
import { valueText } from '../data/values';
import type { DropEvent } from '../dnd/drag-controller';
import { DragController } from '../dnd/drag-controller';
import { createCardEl, refreshOverdue } from '../render/card';
import { addCardButton, createColumnEl, refreshCount } from '../render/column';
import type { BoardConfig, PendingMove } from '../types';
import { readBoardConfig } from './options';

export interface RefreshableView {
	refresh(): void;
}

/** What the view needs from the plugin. */
export interface BoardHost {
	settings: BoardSettings;
	/** Open views, re-rendered when the plugin settings change. */
	views: Set<RefreshableView>;
}

/** Frontmatter key of a note property, null for formula/file properties. */
function noteKey(prop: BasesPropertyId | null): string | null {
	if (!prop) return null;
	const { type, name } = parsePropertyId(prop);
	return type === 'note' ? name : null;
}

/**
 * Kanban view for Bases. Columns come from a note property; dragging a card to
 * another column writes that property. The view only renders the query result:
 * filters, sort and limit are the Bases view's own.
 */
export class BoardView extends BasesView implements HoverParent, RefreshableView {
	readonly type = VIEW_TYPE;
	hoverPopover: HoverPopover | null = null;

	private readonly rootEl: HTMLElement;
	private readonly drag: DragController;
	/** Optimistic moves waiting for the query to catch up, keyed by file path. */
	private readonly pending = new Map<string, PendingMove>();
	private cfg: BoardConfig | null = null;
	private renderDeferred = false;

	constructor(
		controller: QueryController,
		containerEl: HTMLElement,
		private readonly host: BoardHost,
	) {
		super(controller);
		this.rootEl = containerEl.createDiv({ cls: CLS.root });
		this.drag = new DragController(this.rootEl, {
			onDrop: (event) => void this.handleDrop(event),
			onDragEnd: () => this.flushDeferredRender(),
		});
		this.drag.register(this);
		this.registerDomEvent(this.rootEl, 'click', (evt) => this.handleClick(evt));
		this.registerDomEvent(this.rootEl, 'auxclick', (evt) => this.handleClick(evt));
		this.registerDomEvent(this.rootEl, 'mouseover', (evt) => this.handleHover(evt));
		this.registerInterval(window.setInterval(() => this.sweepPending(), PENDING_SWEEP_MS));
		host.views.add(this);
		this.register(() => host.views.delete(this));
	}

	/** Re-render with the current plugin settings (profiles may have changed). */
	refresh(): void {
		if (!this.rootEl.isConnected) {
			this.host.views.delete(this);
			return;
		}
		if (this.data) this.onDataUpdated();
	}

	onDataUpdated(): void {
		// Rebuilding the DOM mid-drag would destroy the dragged element.
		if (this.drag.isDragging) {
			this.renderDeferred = true;
			return;
		}
		this.render();
	}

	private flushDeferredRender(): void {
		if (!this.renderDeferred) return;
		this.renderDeferred = false;
		this.render();
	}

	// ---- rendering -------------------------------------------------------

	private render(): void {
		const cfg = readBoardConfig(this.config, this.host.settings);
		this.cfg = cfg;
		const archived = cfg.hideArchived ? archiveMatcherOf(cfg.profile) : null;
		const entries = archived ? this.data.data.filter((entry) => !archived.test(folderOf(entry.file.path))) : this.data.data;
		const columns = groupIntoColumns(entries, cfg, (entry) => this.columnKeyFor(entry, cfg));

		const previousBoard = this.rootEl.querySelector<HTMLElement>(`.${CLS.board}`);
		const scrollLeft = previousBoard?.scrollLeft ?? 0;
		const scrollTops = new Map<string, number>();
		previousBoard?.querySelectorAll<HTMLElement>(`.${CLS.column}`).forEach((col) => {
			const body = col.querySelector<HTMLElement>(`.${CLS.columnBody}`);
			if (col.dataset.key !== undefined && body) scrollTops.set(col.dataset.key, body.scrollTop);
		});

		this.rootEl.empty();
		this.renderNotes(cfg, entries.length);

		const boardEl = this.rootEl.createDiv({ cls: CLS.board });
		for (const column of columns) {
			if (column.isOther && cfg.hideEmptyOther && column.entries.length === 0) continue;
			const { columnEl, bodyEl } = createColumnEl(boardEl, column);
			for (const entry of column.entries) {
				createCardEl(bodyEl, toCardModel(this.app, entry, cfg, column));
			}
			bodyEl.scrollTop = scrollTops.get(column.key) ?? 0;
			if (!column.isOther && cfg.columnWritable) addCardButton(columnEl, t('column.addCard'));
		}
		boardEl.scrollLeft = scrollLeft;
	}

	private renderNotes(cfg: BoardConfig, entryCount: number): void {
		const notes: string[] = [];
		if (!cfg.profileFound) {
			notes.push(t('hint.profileMissing', { profile: String(this.config.get('profile')), fallback: cfg.profile.name }));
		}
		if (cfg.hideArchived && !archiveMatcherOf(cfg.profile)) {
			notes.push(t('hint.archivePatternInvalid', { profile: cfg.profile.name }));
		}
		if (!cfg.columnWritable) {
			notes.push(t('hint.notWritable', { property: cfg.columnProperty }));
		}
		if (cfg.setCompleted && cfg.completedProperty && !cfg.columns.some((c) => c.value === cfg.doneValue)) {
			notes.push(t('hint.noDoneColumn', { value: cfg.doneValue }));
		}
		if (this.data.groupedData.some((group) => group.hasKey())) {
			notes.push(t('hint.groupByIgnored'));
		}
		if (entryCount === 0) {
			notes.push(t('hint.empty'));
		}
		if (notes.length === 0) return;

		const notesEl = this.rootEl.createDiv({ cls: CLS.notes });
		for (const text of notes) notesEl.createDiv({ cls: CLS.note, text });
	}

	/** Column value of an entry, honouring optimistic moves until the query confirms them. */
	private columnKeyFor(entry: BasesEntry, cfg: BoardConfig): string {
		const live = valueText(entry.getValue(cfg.columnProperty));
		const path = entry.file.path;
		const move = this.pending.get(path);
		if (!move) return live;
		if (live === move.toKey || Date.now() > move.expires) {
			this.pending.delete(path);
			return live;
		}
		return move.toKey;
	}

	private sweepPending(): void {
		if (this.pending.size === 0) return;
		const now = Date.now();
		let expired = false;
		for (const [path, move] of this.pending) {
			if (now > move.expires) {
				this.pending.delete(path);
				expired = true;
			}
		}
		// A move that never got confirmed: show what the query actually says.
		if (expired) this.onDataUpdated();
	}

	// ---- drag and drop ---------------------------------------------------

	private async handleDrop({ path, cardEl, fromKey, toKey, toColumnEl }: DropEvent): Promise<void> {
		const cfg = this.cfg;
		if (!cfg || !cfg.columnWritable || toKey === OTHER_KEY) return;

		const file = this.app.vault.getFileByPath(path);
		if (!file) {
			new Notice(t('notice.fileNotFound'));
			return;
		}

		const fromColumnEl = cardEl.closest<HTMLElement>(`.${CLS.column}`);
		const fromIsDone = fromKey === cfg.doneValue;
		const toIsDone = toKey === cfg.doneValue;

		// Optimistic move: the query re-runs only after the metadata cache updates.
		toColumnEl.querySelector(`.${CLS.columnBody}`)?.appendChild(cardEl);
		refreshOverdue(cardEl, toIsDone);
		if (fromColumnEl) refreshCount(fromColumnEl);
		refreshCount(toColumnEl);
		this.pending.set(path, { toKey, expires: Date.now() + PENDING_TTL_MS });

		try {
			await moveEntry(this.app, file, {
				property: parsePropertyId(cfg.columnProperty).name,
				value: toKey,
				completed:
					cfg.setCompleted && cfg.completedProperty
						? {
								property: parsePropertyId(cfg.completedProperty).name,
								action: completedActionFor(fromIsDone, toIsDone),
								stamp: formatCompleted(new Date(), cfg.profile.completedFormat),
							}
						: undefined,
			});
		} catch (error) {
			console.error('Bases Board: failed to move card', error);
			this.pending.delete(path);
			new Notice(t('notice.moveFailed', { name: file.basename }));
			this.onDataUpdated();
		}
	}

	// ---- new card ---------------------------------------------------------

	private openNewCard(columnKey: string): void {
		const cfg = this.cfg;
		if (!cfg || !cfg.columnWritable || columnKey === OTHER_KEY) return;
		const { profile } = cfg;
		const projectKey = noteKey(cfg.projectProperty);
		const keys = {
			status: parsePropertyId(cfg.columnProperty).name,
			title: noteKey(cfg.titleProperty),
			type: noteKey(cfg.typeProperty),
			project: projectKey,
			completed: cfg.setCompleted ? noteKey(cfg.completedProperty) : null,
		};

		const projectProfile = { ...profile, projectProperty: projectKey ?? '' };
		const projects = projectKey ? collectProjects(this.app, projectProfile) : [];
		// Preselect the project when every card on the board shares it.
		const onBoard = new Set<string>();
		if (projectKey) {
			for (const entry of this.data.data) {
				const project = projectOf(this.app, entry.file, projectProfile);
				if (project) onBoard.add(project.path);
			}
		}
		const [only] = onBoard.size === 1 ? [...onBoard] : [];

		new NewCardModal(this.app, {
			base: { profile, keys, status: columnKey, isDone: columnKey === cfg.doneValue && keys.completed !== null },
			columnLabel: cfg.columns.find((column) => column.value === columnKey)?.label ?? columnKey,
			projects,
			preselected: projects.find((project) => project.path === only) ?? null,
			onCreated: (file) => void this.app.workspace.getLeaf('tab').openFile(file),
		}).open();
	}

	// ---- click and hover -------------------------------------------------

	private handleClick(evt: MouseEvent): void {
		if (evt.button !== 0 && evt.button !== 1) return;
		const target = evt.target as HTMLElement | null;
		const addEl = target?.closest<HTMLElement>(`.${CLS.addCard}`);
		if (addEl) {
			evt.preventDefault();
			const key = addEl.closest<HTMLElement>(`.${CLS.column}`)?.dataset.key;
			if (key !== undefined && evt.button === 0) this.openNewCard(key);
			return;
		}
		const cardEl = target?.closest<HTMLElement>(`.${CLS.card}`);
		const path = cardEl?.dataset.path;
		if (!cardEl || !path) return;

		evt.preventDefault();
		const newTab = evt.button === 1 || Keymap.isModEvent(evt);
		const projectEl = target?.closest<HTMLElement>(`.${CLS.chipProject}`);
		const linkpath = projectEl?.dataset.linkpath;
		if (linkpath) {
			void this.app.workspace.openLinkText(linkpath, path, newTab);
			return;
		}
		void this.app.workspace.openLinkText(path, '', newTab);
	}

	private handleHover(evt: MouseEvent): void {
		const cardEl = (evt.target as HTMLElement | null)?.closest<HTMLElement>(`.${CLS.card}`);
		const path = cardEl?.dataset.path;
		if (!cardEl || !path || this.drag.isDragging) return;
		// mouseover bubbles from children: only react when entering the card.
		const from = evt.relatedTarget as Node | null;
		if (from && cardEl.contains(from)) return;

		this.app.workspace.trigger('hover-link', {
			event: evt,
			source: HOVER_SOURCE,
			hoverParent: this,
			targetEl: cardEl,
			linktext: path,
			sourcePath: '',
		});
	}
}


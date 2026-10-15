import { ItemView, Notice, Platform, getIcon, setTooltip } from 'obsidian';
import { normalizeCanvas, shapePaths } from '@obsidian-plugins/json-canvas-render';
import type { Point, Shape } from '@obsidian-plugins/json-canvas-render';
import type { Creator } from '../canvas/creator';
import type { CanvasSession, SessionUi } from '../canvas/session';
import type { PluginHost } from '../host';
import { t } from '../i18n';
import { DRAG_THRESHOLD, LOCK_KEY, TOOL_GROUPS, nodeAt, placementBox, tool, toolForKey } from '../tools/tools';
import type { NodeBox, ToolDef, ToolId } from '../tools/tools';
import { shapeIcon } from './icons';
import { FilePicker, UrlPrompt, mediaFiles, noteFiles } from './pickers';

/** Lucide icons of the non-shape tools, with fallbacks for older icon sets. */
const ICONS: Partial<Record<ToolId, string[]>> = {
	hand: ['hand'],
	select: ['mouse-pointer-2', 'mouse-pointer'],
	arrow: ['move-right', 'arrow-right'],
	line: ['minus'],
	note: ['file-text'],
	media: ['image'],
	web: ['globe'],
	group: ['group', 'box-select', 'square-dashed'],
};
const LOCKED = ['lock'];
const UNLOCKED = ['lock-open', 'unlock'];

/** Clicks here belong to their own controls, never to a tool. */
const OWN_UI = '.cs-panel, .cs-toolbar, .canvas-controls, .canvas-card-menu, .canvas-menu, .menu, .modal-container';

function lucide(names: readonly string[]): SVGSVGElement | null {
	for (const name of names) {
		const svg = getIcon(name);
		if (svg) return svg;
	}
	return null;
}

/** An event target as an element, also for elements of a popout window. */
function element(target: EventTarget | null): Element | null {
	const node = target as Node | null;
	return node && typeof node.instanceOf === 'function' && node.instanceOf(Element) ? node : null;
}

function isEditable(target: EventTarget | null): boolean {
	const el = element(target);
	if (!el) return false;
	if (el.instanceOf(HTMLElement) && el.isContentEditable) return true;
	return !!el.closest('input, textarea, select, [contenteditable="true"]');
}

interface Gesture {
	pointerId: number;
	tool: ToolDef;
	startClient: Point;
	lastClient: Point;
	startPos: Point;
	moved: boolean;
	/** Card where a connection starts. */
	from: NodeBox | null;
}

/**
 * The elements panel, Excalidraw style: centered at the top of the canvas, every tool visible.
 * Pick a tool, then click on the canvas (default size) or drag (size of the drag). The canvas
 * gets the pointer only while the select tool is on; with another tool, the panel takes the
 * gesture before the canvas sees it (capture phase) and creates the element through the Canvas.
 */
export class Panel implements SessionUi {
	private readonly wrapper: HTMLElement;
	private readonly el: HTMLElement;
	private readonly bar: HTMLElement;
	private readonly hint: HTMLElement;
	private readonly buttons = new Map<ToolId, { el: HTMLButtonElement; label: string }>();
	private readonly lockButton: HTMLButtonElement;
	private readonly cleanups: (() => void)[] = [];
	private current: ToolDef = tool('select');
	private keepTool = false;
	private gesture: Gesture | null = null;
	private preview: SVGSVGElement | null = null;
	private swallowClick = false;
	private visible = false;
	private broken = false;
	private shortcutsShown: boolean | null = null;

	constructor(
		private readonly session: CanvasSession,
		private readonly host: PluginHost,
		private readonly creator: Creator,
	) {
		this.wrapper = session.canvas.wrapperEl;
		this.el = this.wrapper.createDiv({ cls: 'cs-panel' });
		this.el.toggleClass('is-mobile', Platform.isMobile);
		this.bar = this.el.createDiv({ cls: 'cs-panel-bar', attr: { role: 'toolbar', 'aria-label': t('panel.label') } });
		this.hint = this.el.createDiv({ cls: 'cs-panel-hint', attr: { 'aria-live': 'polite' } });

		const lockGroup = this.bar.createDiv({ cls: 'cs-panel-group' });
		this.lockButton = this.button(lockGroup, t('tool.lock'), lucide(UNLOCKED), LOCK_KEY, () => this.setLock(!this.keepTool));
		for (const ids of TOOL_GROUPS) {
			this.bar.createDiv({ cls: 'cs-panel-divider' });
			const group = this.bar.createDiv({ cls: 'cs-panel-group' });
			for (const id of ids) {
				const definition = tool(id);
				const label = t(`tool.${id}`);
				const icon = definition.kind === 'shape' ? shapeIcon(id as Shape) : lucide(ICONS[id] ?? []);
				const el = this.button(group, label, icon, definition.key, () => this.setTool(definition));
				this.buttons.set(id, { el, label });
			}
		}

		// The panel's own clicks never reach the canvas (which would clear the selection).
		for (const type of ['pointerdown', 'mousedown', 'touchstart', 'dblclick', 'wheel', 'contextmenu'] as const) {
			this.listen(this.el, type, (event) => event.stopPropagation(), { passive: true });
		}
		// Gestures of the active tool, before the canvas sees them.
		this.listen(this.wrapper, 'pointerdown', (event) => this.onPointerDown(event as PointerEvent), { capture: true });
		this.listen(this.wrapper, 'pointermove', (event) => this.onPointerMove(event as PointerEvent), { capture: true });
		this.listen(this.wrapper, 'pointerup', (event) => this.onPointerUp(event as PointerEvent), { capture: true });
		this.listen(this.wrapper, 'pointercancel', () => this.cancelGesture(), { capture: true });
		this.listen(this.wrapper, 'click', (event) => this.onClick(event), { capture: true });
		this.listen(this.wrapper, 'dblclick', (event) => this.onClick(event), { capture: true });
		this.listen(this.wrapper, 'touchstart', (event) => this.onTouchStart(event), { capture: true, passive: false });
		this.listen(this.wrapper.doc, 'keydown', (event) => this.onKeyDown(event as KeyboardEvent), { capture: true });

		this.setTool(this.current);
		this.update();
	}

	private listen(target: EventTarget, type: string, handler: (event: Event) => void, options?: AddEventListenerOptions): void {
		target.addEventListener(type, handler, options);
		this.cleanups.push(() => target.removeEventListener(type, handler, options));
	}

	private button(group: HTMLElement, label: string, icon: SVGSVGElement | null, key: string, run: () => void): HTMLButtonElement {
		const el = group.createEl('button', { cls: 'cs-panel-button clickable-icon', attr: { type: 'button', 'aria-label': label } });
		if (icon) {
			icon.addClass('cs-icon');
			el.appendChild(icon);
		}
		el.createSpan({ cls: 'cs-panel-key', text: key.toUpperCase(), attr: { 'aria-hidden': 'true' } });
		el.dataset.key = key;
		this.listen(el, 'click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			run();
		});
		return el;
	}

	update(): void {
		const settings = this.host.settings;
		const visible = settings.panel && !this.broken && !this.session.canvas.readonly;
		if (!visible && this.current.id !== 'select') this.setTool(tool('select'));
		this.visible = visible;
		this.el.toggleClass('is-hidden', !visible);
		this.wrapper.toggleClass('cs-has-panel', visible);
		const shortcuts = settings.panelShortcuts && !Platform.isMobile;
		this.el.toggleClass('cs-no-keys', !shortcuts);
		if (shortcuts !== this.shortcutsShown) {
			this.shortcutsShown = shortcuts;
			for (const { el, label } of this.buttons.values()) setTooltip(el, shortcuts ? t('tool.withKey', { label, key: (el.dataset.key ?? '').toUpperCase() }) : label, { placement: 'bottom' });
			setTooltip(this.lockButton, shortcuts ? t('tool.withKey', { label: t('tool.lock'), key: LOCK_KEY.toUpperCase() }) : t('tool.lock'), { placement: 'bottom' });
		}
		if (visible) this.wrapper.setCssProps({ '--cs-panel-height': `${this.bar.offsetHeight || 44}px` });
	}

	private setTool(definition: ToolDef): void {
		this.cancelGesture();
		this.current = definition;
		for (const [id, { el }] of this.buttons) {
			el.toggleClass('is-active', id === definition.id);
			el.setAttribute('aria-pressed', String(id === definition.id));
		}
		const placing = definition.kind !== 'mode';
		this.wrapper.toggleClass('cs-tool-place', placing);
		this.wrapper.toggleClass('cs-tool-hand', definition.id === 'hand');
		this.showHint();
	}

	private setLock(on: boolean): void {
		this.keepTool = on;
		this.lockButton.toggleClass('is-active', on);
		this.lockButton.setAttribute('aria-pressed', String(on));
		const icon = lucide(on ? LOCKED : UNLOCKED);
		const old = this.lockButton.querySelector('svg');
		if (icon) {
			icon.addClass('cs-icon');
			if (old) old.replaceWith(icon);
			else this.lockButton.prepend(icon);
		}
		this.showHint();
	}

	private showHint(text?: string): void {
		const kind = this.current.kind;
		const base =
			text ??
			(this.current.id === 'hand' ? t('hint.hand') : kind === 'edge' ? t('hint.edge') : kind === 'mode' ? '' : t('hint.place'));
		this.hint.setText(base && this.keepTool ? `${base} · ${t('hint.locked')}` : base);
	}

	private ownUi(target: EventTarget | null): boolean {
		return !!element(target)?.closest(OWN_UI);
	}

	private active(): boolean {
		return this.visible && this.current.id !== 'select';
	}

	private onPointerDown(event: PointerEvent): void {
		if (!this.active() || this.gesture || !event.isPrimary) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		if (this.ownUi(event.target)) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		const startPos = this.creator.canvas.posFromEvt(event);
		let from: NodeBox | null = null;
		if (this.current.kind === 'edge') {
			from = nodeAt(this.nodeBoxes(), startPos);
			if (!from) {
				this.showHint(t('hint.edgeStart'));
				return;
			}
		}
		const client = { x: event.clientX, y: event.clientY };
		this.gesture = { pointerId: event.pointerId, tool: this.current, startClient: client, lastClient: client, startPos, moved: false, from };
		try {
			this.wrapper.setPointerCapture(event.pointerId);
		} catch {
			// The pointer may already be gone.
		}
	}

	private onPointerMove(event: PointerEvent): void {
		const gesture = this.gesture;
		if (!gesture || event.pointerId !== gesture.pointerId) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		const client = { x: event.clientX, y: event.clientY };
		if (gesture.tool.id === 'hand') {
			const scale = this.creator.canvas.scale || 1;
			this.creator.canvas.panBy(-(client.x - gesture.lastClient.x) / scale, -(client.y - gesture.lastClient.y) / scale);
			gesture.lastClient = client;
			return;
		}
		if (!gesture.moved && Math.hypot(client.x - gesture.startClient.x, client.y - gesture.startClient.y) < DRAG_THRESHOLD) return;
		gesture.moved = true;
		gesture.lastClient = client;
		this.drawPreview(gesture, client);
	}

	private onPointerUp(event: PointerEvent): void {
		const gesture = this.gesture;
		if (!gesture || event.pointerId !== gesture.pointerId) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		this.cancelGesture();
		this.swallowClick = true;
		this.wrapper.win.setTimeout(() => (this.swallowClick = false), 400);
		if (gesture.tool.id === 'hand') return;
		this.finish(gesture, gesture.moved ? this.creator.canvas.posFromEvt(event) : null);
	}

	/** The click (and double click, which makes a card natively) after a tool gesture is ours. */
	private onClick(event: Event): void {
		if (this.ownUi(event.target)) return;
		if (this.swallowClick || this.active()) {
			event.preventDefault();
			event.stopImmediatePropagation();
			this.swallowClick = false;
		}
	}

	/** Keep the canvas from starting its own touch pan or pinch under an active tool. */
	private onTouchStart(event: Event): void {
		if (this.active() && !this.ownUi(event.target)) event.stopImmediatePropagation();
	}

	private onKeyDown(event: KeyboardEvent): void {
		if (!this.visible || !this.host.settings.panelShortcuts) return;
		if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.defaultPrevented) return;
		if (this.host.app.workspace.getActiveViewOfType(ItemView) !== this.session.view) return;
		const doc = this.wrapper.doc;
		if (isEditable(event.target) || isEditable(doc.activeElement) || doc.body.querySelector('.menu, .modal-container')) return;
		// While a card, edge label or group label is being edited, keys (Esc included) belong to it.
		if (this.wrapper.querySelector('.canvas-node.is-editing, .canvas-path-label.is-editing, .canvas-group-label[contenteditable="true"]')) return;
		if (event.key === 'Escape') {
			if (this.current.id === 'select' && !this.gesture) return;
			this.setTool(tool('select'));
		} else if (event.key.toLowerCase() === LOCK_KEY) {
			this.setLock(!this.keepTool);
		} else {
			const definition = toolForKey(event.key);
			if (!definition) return;
			this.setTool(definition);
		}
		event.preventDefault();
		event.stopPropagation();
	}

	private cancelGesture(): void {
		const gesture = this.gesture;
		this.gesture = null;
		this.preview?.remove();
		this.preview = null;
		if (gesture) {
			try {
				this.wrapper.releasePointerCapture(gesture.pointerId);
			} catch {
				// Already released.
			}
		}
	}

	private drawPreview(gesture: Gesture, client: Point): void {
		const rect = this.wrapper.getBoundingClientRect();
		const start = { x: gesture.startClient.x - rect.left, y: gesture.startClient.y - rect.top };
		const end = { x: client.x - rect.left, y: client.y - rect.top };
		this.preview ??= this.wrapper.createSvg('svg', { cls: 'cs-preview', attr: { 'aria-hidden': 'true' } });
		this.preview.empty();
		if (gesture.tool.kind === 'edge') {
			this.preview.createSvg('line', { cls: 'cs-preview-line', attr: { x1: start.x, y1: start.y, x2: end.x, y2: end.y } });
			this.preview.createSvg('circle', { cls: 'cs-preview-end', attr: { cx: end.x, cy: end.y, r: 4 } });
			return;
		}
		const box = placementBox(gesture.tool, start, end, 1);
		const shape: Shape = gesture.tool.kind === 'shape' ? (gesture.tool.id as Shape) : 'rectangle';
		const scale = this.creator.canvas.scale || 1;
		this.preview.createSvg('path', {
			cls: 'cs-preview-shape',
			attr: { d: shapePaths(shape, box.width, box.height, 8 * scale).outline, transform: `translate(${box.x} ${box.y})` },
		});
	}

	/** Cards of the canvas (positions and sizes), in z-order. */
	private nodeBoxes(): NodeBox[] {
		return normalizeCanvas(this.creator.canvas.getData()).nodes.map((node) => ({
			id: node.id,
			type: node.type,
			x: node.x,
			y: node.y,
			width: node.width,
			height: node.height,
		}));
	}

	private finish(gesture: Gesture, end: Point | null): void {
		const definition = gesture.tool;
		const { app } = this.host;
		const box = placementBox(definition, gesture.startPos, end);
		this.run(() => {
			switch (definition.kind) {
				case 'shape':
					this.creator.text(box, definition.id as Shape);
					break;
				case 'group':
					this.creator.group(box);
					break;
				case 'link':
					new UrlPrompt(app, (url) => this.run(() => this.creator.link(box, url))).open();
					break;
				case 'file': {
					const note = definition.id === 'note';
					const files = note ? noteFiles(app) : mediaFiles(app);
					new FilePicker(app, files, t(note ? 'picker.note' : 'picker.media'), (file) => this.run(() => this.creator.file(box, file))).open();
					break;
				}
				case 'edge': {
					if (!end || !gesture.from) break;
					const arrow = definition.id === 'arrow';
					const to = nodeAt(this.nodeBoxes(), end);
					if (to && to.id !== gesture.from.id) this.creator.connect(gesture.from, to, arrow);
					else if (!to) this.creator.connectToNew(gesture.from, placementBox(tool('rectangle'), end, null), arrow);
					break;
				}
				case 'mode':
					break;
			}
		});
		if (!this.keepTool) this.setTool(tool('select'));
	}

	/** Creating went wrong: tell, and turn the panel off on this canvas (the rest keeps working). */
	private run(create: () => unknown): void {
		try {
			create();
		} catch (error) {
			console.error('Canvas Shapes: could not create the element', error);
			new Notice(t('notice.createFailed', { error: error instanceof Error ? error.message : String(error) }));
			this.broken = true;
			this.update();
		}
	}

	destroy(): void {
		this.cancelGesture();
		for (const cleanup of this.cleanups.splice(0)) cleanup();
		this.el.remove();
		this.wrapper.removeClasses(['cs-has-panel', 'cs-tool-place', 'cs-tool-hand']);
		this.wrapper.setCssProps({ '--cs-panel-height': '' });
	}
}

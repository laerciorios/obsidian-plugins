import { Platform, setTooltip } from 'obsidian';
import { common } from '../canvas/editor';
import type { CanvasSession, SessionUi } from '../canvas/session';
import { t } from '../i18n';
import { LINE_OPTIONS, SHAPE_OPTIONS, WIDTH_OPTIONS } from '../options';
import { lineIcon, shapeIcon, widthIcon } from './icons';

interface Button<T> {
	value: T;
	el: HTMLButtonElement;
}

/**
 * Floating toolbar of one canvas, Excalidraw style: shown while the selection has something it
 * can style, with one group per property and the current value highlighted (none when the
 * selection is mixed). Lives in the canvas wrapper, top left, and swallows pointer events so a
 * click never reaches the canvas (which would clear the selection).
 */
export class Toolbar implements SessionUi {
	private readonly el: HTMLElement;
	private readonly shapeGroup: HTMLElement;
	private readonly shapeButtons: Button<(typeof SHAPE_OPTIONS)[number]>[] = [];
	private readonly lineGroup: HTMLElement;
	private readonly lineButtons: Button<(typeof LINE_OPTIONS)[number]>[] = [];
	private readonly widthGroup: HTMLElement;
	private readonly widthButtons: Button<number>[] = [];
	private readonly divider: HTMLElement;
	private readonly cleanups: (() => void)[] = [];

	constructor(private readonly session: CanvasSession) {
		const wrapper = session.canvas.wrapperEl;
		this.el = wrapper.createDiv({ cls: 'cs-toolbar', attr: { role: 'toolbar', 'aria-label': t('toolbar.label') } });
		this.el.toggleClass('is-mobile', Platform.isMobile);
		for (const type of ['pointerdown', 'mousedown', 'touchstart', 'dblclick', 'wheel', 'contextmenu'] as const) {
			const stop = (event: Event): void => event.stopPropagation();
			this.el.addEventListener(type, stop, { passive: true });
			this.cleanups.push(() => this.el.removeEventListener(type, stop));
		}

		this.shapeGroup = this.group(t('toolbar.shape'));
		for (const shape of SHAPE_OPTIONS) {
			const el = this.button(this.shapeGroup, t(`shape.${shape}`), shapeIcon(shape), () => {
				this.session.edit((editor) => editor.setShape(editor.selected().nodes, shape));
			});
			this.shapeButtons.push({ value: shape, el });
		}

		this.divider = this.el.createDiv({ cls: 'cs-toolbar-divider' });
		this.lineGroup = this.group(t('toolbar.line'));
		for (const line of LINE_OPTIONS) {
			const el = this.button(this.lineGroup, t(`line.${line}`), lineIcon(line), () => {
				this.session.edit((editor) => editor.setLineStyle(editor.selected().edges, line));
			});
			this.lineButtons.push({ value: line, el });
		}
		this.widthGroup = this.group(t('toolbar.width'));
		for (const { name, width } of WIDTH_OPTIONS) {
			const el = this.button(this.widthGroup, t(`width.${name}`), widthIcon(width), () => {
				this.session.edit((editor) => editor.setLineWidth(editor.selected().edges, width));
			});
			this.widthButtons.push({ value: width, el });
		}
		this.update();
	}

	private group(label: string): HTMLElement {
		return this.el.createDiv({ cls: 'cs-toolbar-group', attr: { role: 'group', 'aria-label': label } });
	}

	private button(group: HTMLElement, label: string, icon: SVGSVGElement, run: () => void): HTMLButtonElement {
		const el = group.createEl('button', { cls: 'cs-toolbar-button clickable-icon', attr: { type: 'button', 'aria-label': label } });
		setTooltip(el, label, { placement: 'bottom' });
		el.appendChild(icon);
		const click = (event: MouseEvent): void => {
			event.preventDefault();
			event.stopPropagation();
			run();
		};
		el.addEventListener('click', click);
		this.cleanups.push(() => el.removeEventListener('click', click));
		return el;
	}

	update(): void {
		const { canvas, editor } = this.session;
		const selected = editor.selected();
		const hasNodes = selected.nodes.length > 0;
		const hasEdges = selected.edges.length > 0;
		const visible = !canvas.readonly && (hasNodes || hasEdges);
		this.el.toggleClass('is-hidden', !visible);
		this.shapeGroup.toggleClass('is-hidden', !hasNodes);
		this.divider.toggleClass('is-hidden', !hasNodes || !hasEdges);
		this.lineGroup.toggleClass('is-hidden', !hasEdges);
		this.widthGroup.toggleClass('is-hidden', !hasEdges);
		if (!visible) return;
		const shape = common(selected.nodes.map((node) => editor.shapeOf(node)));
		for (const button of this.shapeButtons) this.mark(button.el, button.value === shape);
		const styles = selected.edges.map((edge) => editor.styleOf(edge));
		const line = common(styles.map((style) => style.line));
		const width = common(styles.map((style) => style.width));
		for (const button of this.lineButtons) this.mark(button.el, button.value === line);
		for (const button of this.widthButtons) this.mark(button.el, button.value === width);
	}

	private mark(el: HTMLButtonElement, active: boolean): void {
		el.toggleClass('is-active', active);
		el.setAttribute('aria-pressed', String(active));
	}

	destroy(): void {
		for (const cleanup of this.cleanups) cleanup();
		this.el.remove();
	}
}

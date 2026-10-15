import type { Events, Menu, MenuItem, Plugin } from 'obsidian';
import type { ShapesController } from '../canvas/controller';
import { common } from '../canvas/editor';
import type { CanvasSession } from '../canvas/session';
import { t } from '../i18n';
import { LINE_OPTIONS, SHAPE_OPTIONS, WIDTH_OPTIONS } from '../options';

/**
 * Context menu entries on cards, edges and multi-selections, through the Canvas's own (untyped)
 * workspace events. A submenu when Obsidian offers one, flat checked items otherwise.
 */

const SECTION = 'canvas-shapes';

type WithSubmenu = MenuItem & { setSubmenu?: () => Menu };

interface Choice {
	title: string;
	checked: boolean;
	run: () => void;
}

/** Add a titled group of choices: a submenu when available, else items prefixed with the title. */
export function addChoices(menu: Menu, title: string, icon: string, choices: Choice[]): void {
	let submenu: Menu | null = null;
	menu.addItem((item) => {
		const setSubmenu = (item as WithSubmenu).setSubmenu;
		if (typeof setSubmenu !== 'function') {
			item.setIsLabel(true).setTitle(title).setSection(SECTION);
			return;
		}
		item.setTitle(title).setIcon(icon).setSection(SECTION);
		submenu = setSubmenu.call(item);
	});
	const target: Menu = submenu ?? menu;
	for (const choice of choices) {
		target.addItem((item) => {
			item.setTitle(choice.title).setChecked(choice.checked).onClick(choice.run);
			if (!submenu) item.setSection(SECTION);
		});
	}
}

function addShapeChoices(menu: Menu, session: CanvasSession): void {
	const { editor } = session;
	const nodes = editor.selected().nodes;
	if (nodes.length === 0 || session.canvas.readonly) return;
	const current = common(nodes.map((node) => editor.shapeOf(node)));
	addChoices(
		menu,
		t('menu.shape'),
		'shapes',
		SHAPE_OPTIONS.map((shape) => ({
			title: t(`shape.${shape}`),
			checked: shape === current,
			run: () => session.edit((edit) => edit.setShape(edit.selected().nodes, shape)),
		})),
	);
}

function addLineChoices(menu: Menu, session: CanvasSession): void {
	const { editor } = session;
	const edges = editor.selected().edges;
	if (edges.length === 0 || session.canvas.readonly) return;
	const styles = edges.map((edge) => editor.styleOf(edge));
	const line = common(styles.map((style) => style.line));
	const width = common(styles.map((style) => style.width));
	addChoices(
		menu,
		t('menu.line'),
		'spline',
		LINE_OPTIONS.map((option) => ({
			title: t(`line.${option}`),
			checked: option === line,
			run: () => session.edit((edit) => edit.setLineStyle(edit.selected().edges, option)),
		})),
	);
	addChoices(
		menu,
		t('menu.width'),
		'line-squiggle',
		WIDTH_OPTIONS.map((option) => ({
			title: t(`width.${option.name}`),
			checked: option.width === width,
			run: () => session.edit((edit) => edit.setLineWidth(edit.selected().edges, option.width)),
		})),
	);
}

export function registerMenus(plugin: Plugin, controller: ShapesController): void {
	const workspace = plugin.app.workspace as Events;
	// Right-clicking a card selects it first, so the selection is the card.
	plugin.registerEvent(
		workspace.on('canvas:node-menu', (menu: unknown, node: unknown) => {
			const session = controller.sessionForCanvas((node as { canvas?: unknown } | null)?.canvas);
			if (session) addShapeChoices(menu as Menu, session);
		}),
	);
	// Same for an edge: right-clicking it selects it.
	plugin.registerEvent(
		workspace.on('canvas:edge-menu', (menu: unknown, edge: unknown) => {
			const session = controller.sessionForCanvas((edge as { canvas?: unknown } | null)?.canvas);
			if (session) addLineChoices(menu as Menu, session);
		}),
	);
	plugin.registerEvent(
		workspace.on('canvas:selection-menu', (menu: unknown, canvas: unknown) => {
			const session = controller.sessionForCanvas(canvas);
			if (!session) return;
			addShapeChoices(menu as Menu, session);
			addLineChoices(menu as Menu, session);
		}),
	);
}

import { ItemView, Notice } from 'obsidian';
import type { Plugin, View } from 'obsidian';
import { t } from '../i18n';
import { detectCanvas } from './internals';
import type { Detection } from './internals';
import { CanvasSession } from './session';
import type { SessionUi } from './session';

export const CANVAS_VIEW = 'canvas';

/**
 * Attaches a session to every open canvas tab and drops it when the tab goes away. A canvas the
 * plugin does not recognize gets no session: no drawing, no toolbar, no edit commands, and one
 * notice per plugin load. Export does not need a session (it reads the JSON).
 */
export class ShapesController {
	private readonly sessions = new Map<View, CanvasSession>();
	/** Views whose canvas was not recognized or failed: not retried until they are reopened. */
	private readonly failed = new WeakSet<View>();
	private warned = false;
	/** Swappable for tests in the app (forcing a detection failure). */
	detect: (view: unknown) => Detection = detectCanvas;

	constructor(
		private readonly plugin: Plugin,
		/** Interfaces to attach to every new session (the toolbar). */
		private readonly createUi: (session: CanvasSession) => SessionUi[] = () => [],
	) {}

	load(): void {
		const { workspace } = this.plugin.app;
		workspace.onLayoutReady(() => this.scan());
		this.plugin.registerEvent(workspace.on('layout-change', () => this.scan()));
		this.plugin.register(() => this.unload());
	}

	/** Sessions for new canvas tabs; dispose the sessions of closed tabs. */
	scan(): void {
		const views = new Set<View>();
		for (const leaf of this.plugin.app.workspace.getLeavesOfType(CANVAS_VIEW)) {
			if (leaf.isDeferred) continue;
			views.add(leaf.view);
			if (!this.sessions.has(leaf.view) && !this.failed.has(leaf.view)) this.attach(leaf.view);
		}
		for (const [view, session] of this.sessions) {
			if (views.has(view)) continue;
			session.dispose();
			this.sessions.delete(view);
		}
	}

	private attach(view: View): void {
		const detection = this.detect(view);
		if (!detection.ok) {
			this.reject(view, detection.reason);
			return;
		}
		const session = new CanvasSession(view, detection.canvas, {
			failed: (failed, error) => {
				this.sessions.delete(view);
				this.reject(view, error instanceof Error ? error.message : String(error));
			},
		});
		if (!session.isActive) return;
		this.sessions.set(view, session);
		for (const ui of this.createUi(session)) session.attach(ui);
	}

	private reject(view: View, reason: string): void {
		this.failed.add(view);
		console.warn(`Canvas Shapes: this canvas is not supported (${reason}). The toolbar is off; the file is untouched.`);
		if (this.warned) return;
		this.warned = true;
		new Notice(t('notice.unsupported'), 10000);
	}

	/** The session of the active canvas tab, if it has one. */
	activeSession(): CanvasSession | null {
		const view = this.plugin.app.workspace.getActiveViewOfType(ItemView);
		const session = view ? this.sessions.get(view) : undefined;
		return session?.isActive ? session : null;
	}

	/** The session drawing on this canvas object (menus get the canvas, not the view). */
	sessionForCanvas(canvas: unknown): CanvasSession | null {
		for (const session of this.sessions.values()) if (session.isActive && session.canvas === canvas) return session;
		return null;
	}

	sessionFor(view: View): CanvasSession | null {
		const session = this.sessions.get(view);
		return session?.isActive ? session : null;
	}


	private unload(): void {
		for (const session of this.sessions.values()) session.dispose();
		this.sessions.clear();
	}
}

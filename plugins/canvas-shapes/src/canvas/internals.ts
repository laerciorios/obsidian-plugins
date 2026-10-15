/**
 * The parts of Obsidian's Canvas the plugin relies on. The Canvas has no public editing API, so
 * these are internals (checked against Obsidian 1.14): every access goes through `detectCanvas`,
 * which verifies the shape of the objects before the plugin touches anything. Nothing here
 * imports `obsidian`, so detection and editing can be unit-tested with plain objects.
 */

export type Data = Record<string, unknown>;

/** A card on the canvas (text, file, link or group). */
export interface CanvasNodeLike {
	id: string;
	nodeEl: HTMLElement;
	/** Keys Obsidian does not know, saved back with the node: where `canvasShapes` lives. */
	unknownData: Data;
	/** Non-zero: resizing keeps width / height at this ratio. */
	aspectRatio: number;
	getData(): Data;
	setData(data: Data): void;
}

/** A connection between two cards. */
export interface CanvasEdgeLike {
	id: string;
	unknownData: Data;
	/** The line (`path.canvas-display-path` inside). */
	lineGroupEl: SVGElement;
	/** The arrowheads. */
	lineEndGroupEl: SVGElement;
	getData(): Data;
	setData(data: Data): void;
}

export type CanvasItem = CanvasNodeLike | CanvasEdgeLike;

export interface CanvasLike {
	nodes: Map<string, CanvasNodeLike>;
	edges: Map<string, CanvasEdgeLike>;
	selection: Set<CanvasItem>;
	/** The file's root object; `getData()` spreads it, so extra root keys survive saving. */
	data: Data;
	readonly: boolean;
	wrapperEl: HTMLElement;
	getData(): Data;
	/** Snapshot `data`, push an undo step and save the file (debounced). */
	requestSave(): void;
	/** Every data change that does not come from the plugin: undo, redo, paste, duplicate, reload. */
	importData(data: Data, clear?: boolean): unknown;
	/** Every selection change. */
	updateSelection(change: () => void): void;
}

export type Detection = { ok: true; canvas: CanvasLike } | { ok: false; reason: string };

/** Options of the Canvas's own `create*Node` methods: `pos` is the top-left corner. */
export interface CreateOptions {
	pos: { x: number; y: number };
	size: { width: number; height: number };
	save?: boolean;
	/** Select the new node (and open text cards for typing, group labels for renaming). */
	focus?: boolean;
}

/** What the elements panel needs on top of `CanvasLike`: creating nodes and the viewport. */
export interface CanvasCreationLike extends CanvasLike {
	/** Zoom factor (canvas px → screen px). */
	scale: number;
	/** Canvas position of a pointer event. */
	posFromEvt(event: MouseEvent): { x: number; y: number };
	panBy(dx: number, dy: number): void;
	createTextNode(options: CreateOptions & { text?: string }): unknown;
	createFileNode(options: CreateOptions & { file: unknown }): unknown;
	createLinkNode(options: CreateOptions & { url: string }): unknown;
	createGroupNode(options: CreateOptions & { label?: string }): unknown;
}

export type CreationDetection = { ok: true; canvas: CanvasCreationLike } | { ok: false; reason: string };

/** Check the creation and viewport methods the panel uses; the rest of the plugin does not need them. */
export function detectCreation(canvas: CanvasLike): CreationDetection {
	const host = canvas as unknown as Record<string, unknown>;
	if (typeof host.scale !== 'number' || !Number.isFinite(host.scale)) return { ok: false, reason: 'scale' };
	for (const method of ['posFromEvt', 'panBy', 'createTextNode', 'createFileNode', 'createLinkNode', 'createGroupNode']) {
		if (!isFunction(host[method])) return { ok: false, reason: method };
	}
	return { ok: true, canvas: canvas as CanvasCreationLike };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

const isFunction = (value: unknown): boolean => typeof value === 'function';

/** Whether a value looks like a canvas node (checked on every node before it is used). */
export function isCanvasNode(value: unknown): value is CanvasNodeLike {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		isRecord(value.nodeEl) &&
		isRecord(value.unknownData) &&
		isFunction(value.getData) &&
		isFunction(value.setData)
	);
}

/** Whether a value looks like a canvas edge. */
export function isCanvasEdge(value: unknown): value is CanvasEdgeLike {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		isRecord(value.lineGroupEl) &&
		isRecord(value.lineEndGroupEl) &&
		isRecord(value.unknownData) &&
		isFunction(value.getData) &&
		isFunction(value.setData)
	);
}

/**
 * Find and check the canvas of a view. The reason of a failure is a short code for the console,
 * not shown to the user.
 */
export function detectCanvas(view: unknown): Detection {
	if (!isRecord(view)) return { ok: false, reason: 'no-view' };
	const canvas = view.canvas;
	if (!isRecord(canvas)) return { ok: false, reason: 'no-canvas' };
	if (!(canvas.nodes instanceof Map)) return { ok: false, reason: 'nodes' };
	if (!(canvas.edges instanceof Map)) return { ok: false, reason: 'edges' };
	if (!(canvas.selection instanceof Set)) return { ok: false, reason: 'selection' };
	if (!isRecord(canvas.data)) return { ok: false, reason: 'data' };
	if (typeof canvas.readonly !== 'boolean') return { ok: false, reason: 'readonly' };
	if (!isRecord(canvas.wrapperEl)) return { ok: false, reason: 'wrapper' };
	for (const method of ['getData', 'requestSave', 'importData', 'updateSelection']) {
		if (!isFunction(canvas[method])) return { ok: false, reason: method };
	}
	for (const node of canvas.nodes.values()) if (!isCanvasNode(node)) return { ok: false, reason: 'node-shape' };
	for (const edge of canvas.edges.values()) if (!isCanvasEdge(edge)) return { ok: false, reason: 'edge-shape' };
	const data: unknown = (canvas.getData as () => unknown).call(canvas);
	if (!isRecord(data) || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) return { ok: false, reason: 'get-data' };
	return { ok: true, canvas: canvas as unknown as CanvasLike };
}

/**
 * Run `after` after every call of `target[name]`, on this instance only (never the prototype).
 * The original always runs first and its result is returned; errors in `after` are reported to
 * `onError` and never reach Obsidian. Returns the function that restores the original.
 */
export function afterMethod<T extends object>(
	target: T,
	name: string,
	after: (args: unknown[], result: unknown) => void,
	onError: (error: unknown) => void,
): () => void {
	const host = target as Record<string, unknown>;
	const original = host[name];
	if (typeof original !== 'function') throw new Error(`Cannot hook ${name}`);
	const hadOwn = Object.prototype.hasOwnProperty.call(host, name);
	const wrapper = function (this: unknown, ...args: unknown[]): unknown {
		const result: unknown = (original as (...a: unknown[]) => unknown).apply(this, args);
		try {
			after(args, result);
		} catch (error) {
			onError(error);
		}
		return result;
	};
	host[name] = wrapper;
	return () => {
		// Someone else may have wrapped it after us: leave their wrapper in place.
		if (host[name] !== wrapper) return;
		if (hadOwn) host[name] = original;
		else delete host[name];
	};
}

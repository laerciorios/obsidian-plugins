import type { LineStyle, Shape } from './extensions';
import type { EdgeEnd, NodeSide, Point, Rect } from './types';

/**
 * Geometry shared by the SVG renderer and the plugin's drawing on the Obsidian Canvas, so both
 * show the same shapes and lines. Edge routing follows Obsidian's Canvas (1.14): edges leave from
 * the middle of a side, 7px out, as a cubic Bézier whose control points sit along the side normal.
 */

export const SIDES: readonly NodeSide[] = ['top', 'right', 'bottom', 'left'];

/** Corner radius of rectangular cards (Obsidian's --radius-m). */
export const CARD_RADIUS = 8;

/** Gap between a node side and the start of the line (the arrowhead fills it). */
const EDGE_GAP = 7;
const MIN_CONTROL = 70;
const MAX_CONTROL = 150;

/** Arrowhead polygon pointing at the origin, as in Obsidian ("0,0 6.5,10.4 -6.5,10.4"). */
export const ARROW_POINTS: readonly Point[] = [
	{ x: 0, y: 0 },
	{ x: 6.5, y: 10.4 },
	{ x: -6.5, y: 10.4 },
];

/** Rotation (degrees, clockwise) that turns the arrowhead toward a node from each side. */
export const ARROW_ROTATION: Record<NodeSide, number> = { top: 180, right: 270, bottom: 0, left: 90 };

export interface ShapePaths {
	/** Closed outline: filled with the card background and stroked. */
	outline: string;
	/** Extra strokes drawn over the fill (the visible rim of a cylinder). */
	details: string[];
}

const round = (value: number): number => Math.round(value * 100) / 100;
const n = (value: number): string => String(round(value));

/** Height of the top and bottom ellipses of a cylinder (half of each ellipse's height). */
export function cylinderCap(width: number, height: number): number {
	return Math.max(0, Math.min(height * 0.2, width * 0.15, height / 2));
}

export function roundedRectPath(width: number, height: number, radius = CARD_RADIUS): string {
	const r = Math.max(0, Math.min(radius, width / 2, height / 2));
	if (r === 0) return `M0 0H${n(width)}V${n(height)}H0Z`;
	return (
		`M${n(r)} 0H${n(width - r)}A${n(r)} ${n(r)} 0 0 1 ${n(width)} ${n(r)}` +
		`V${n(height - r)}A${n(r)} ${n(r)} 0 0 1 ${n(width - r)} ${n(height)}` +
		`H${n(r)}A${n(r)} ${n(r)} 0 0 1 0 ${n(height - r)}V${n(r)}A${n(r)} ${n(r)} 0 0 1 ${n(r)} 0Z`
	);
}

/** SVG paths of a shape in a `width` × `height` box with its origin at 0,0. */
export function shapePaths(shape: Shape, width: number, height: number, radius = CARD_RADIUS): ShapePaths {
	const w = Math.max(0, width);
	const h = Math.max(0, height);
	switch (shape) {
		case 'circle': {
			const rx = w / 2;
			const ry = h / 2;
			return {
				outline: `M0 ${n(ry)}A${n(rx)} ${n(ry)} 0 1 1 ${n(w)} ${n(ry)}A${n(rx)} ${n(ry)} 0 1 1 0 ${n(ry)}Z`,
				details: [],
			};
		}
		case 'diamond':
			return { outline: `M${n(w / 2)} 0L${n(w)} ${n(h / 2)}L${n(w / 2)} ${n(h)}L0 ${n(h / 2)}Z`, details: [] };
		case 'cylinder': {
			const rx = w / 2;
			const ry = cylinderCap(w, h);
			const arc = `A${n(rx)} ${n(ry)} 0 0`;
			return {
				outline: `M0 ${n(ry)}${arc} 1 ${n(w)} ${n(ry)}V${n(h - ry)}${arc} 1 0 ${n(h - ry)}Z`,
				details: [`M0 ${n(ry)}${arc} 0 ${n(w)} ${n(ry)}`],
			};
		}
		case 'rectangle':
		case 'square':
			return { outline: roundedRectPath(w, h, radius), details: [] };
	}
}

/** Area inside a shape where the content goes, relative to the node's top-left corner. */
export function contentBox(shape: Shape, width: number, height: number): Rect {
	switch (shape) {
		case 'circle': {
			// The largest rectangle with the box's proportions inside the ellipse.
			const inset = (1 - Math.SQRT1_2) / 2;
			return { x: width * inset, y: height * inset, width: width * Math.SQRT1_2, height: height * Math.SQRT1_2 };
		}
		case 'diamond':
			return { x: width / 4, y: height / 4, width: width / 2, height: height / 2 };
		case 'cylinder': {
			const cap = cylinderCap(width, height);
			return { x: 0, y: cap * 2, width, height: Math.max(0, height - cap * 3) };
		}
		case 'rectangle':
		case 'square':
			return { x: 0, y: 0, width, height };
	}
}

/** Shapes whose content is centered (rectangles keep Obsidian's top-left layout). */
export function centersContent(shape: Shape): boolean {
	return shape === 'circle' || shape === 'diamond' || shape === 'cylinder';
}

/** Content box as fractions of the node size, for CSS (insets in %, top/right/bottom/left). */
export function contentInsets(shape: Shape, width: number, height: number): [number, number, number, number] {
	const box = contentBox(shape, width, height);
	const pct = (value: number, total: number): number => (total > 0 ? round((value / total) * 100) : 0);
	return [
		pct(box.y, height),
		pct(width - box.x - box.width, width),
		pct(height - box.y - box.height, height),
		pct(box.x, width),
	];
}

export function sidePoint(rect: Rect, side: NodeSide): Point {
	switch (side) {
		case 'top':
			return { x: rect.x + rect.width / 2, y: rect.y };
		case 'right':
			return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
		case 'bottom':
			return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
		case 'left':
			return { x: rect.x, y: rect.y + rect.height / 2 };
	}
}

/** The side of `from` facing `to`, as Obsidian picks it for edges without a side. */
export function facingSide(from: Rect, to: Rect): NodeSide {
	const angle = Math.atan2(to.y + to.height / 2 - (from.y + from.height / 2), to.x + to.width / 2 - (from.x + from.width / 2));
	const corner = Math.atan2(from.height, from.width);
	if (angle > -corner && angle <= corner) return 'right';
	if (angle > corner && angle <= Math.PI - corner) return 'bottom';
	if (angle > Math.PI - corner || angle <= -(Math.PI - corner)) return 'left';
	return 'top';
}

function moveOut(point: Point, side: NodeSide, distance: number): Point {
	switch (side) {
		case 'top':
			return { x: point.x, y: point.y - distance };
		case 'right':
			return { x: point.x + distance, y: point.y };
		case 'bottom':
			return { x: point.x, y: point.y + distance };
		case 'left':
			return { x: point.x - distance, y: point.y };
	}
}

export interface Bezier {
	from: Point;
	cp1: Point;
	cp2: Point;
	to: Point;
}

export function bezierPoint(curve: Bezier, t: number): Point {
	const u = 1 - t;
	const a = u * u * u;
	const b = 3 * t * u * u;
	const c = 3 * t * t * u;
	const d = t * t * t;
	return {
		x: a * curve.from.x + b * curve.cp1.x + c * curve.cp2.x + d * curve.to.x,
		y: a * curve.from.y + b * curve.cp1.y + c * curve.cp2.y + d * curve.to.y,
	};
}

export interface EdgeTip {
	/** Where the arrowhead's point touches the node. */
	at: Point;
	side: NodeSide;
}

export interface EdgeGeometry {
	/** SVG path of the line (without arrowheads). */
	path: string;
	curve: Bezier;
	/** Where the label is centered (middle of the curve). */
	label: Point;
	/** Arrowheads to draw. */
	arrows: EdgeTip[];
	/** Points that bound the drawing (for the canvas bounds). */
	extent: Point[];
}

/** Line and arrowheads of an edge between two node rectangles, as Obsidian draws it. */
export function edgeGeometry(
	from: Rect,
	fromSide: NodeSide,
	fromEnd: EdgeEnd,
	to: Rect,
	toSide: NodeSide,
	toEnd: EdgeEnd,
): EdgeGeometry {
	const a = sidePoint(from, fromSide);
	const start = moveOut(a, fromSide, EDGE_GAP);
	const b = sidePoint(to, toSide);
	const end = moveOut(b, toSide, EDGE_GAP);
	const distance = Math.hypot(end.x - start.x, end.y - start.y);
	const control = Math.min(MAX_CONTROL, Math.max(MIN_CONTROL, distance / 2));
	const curve: Bezier = { from: start, cp1: moveOut(start, fromSide, control), cp2: moveOut(end, toSide, control), to: end };
	const p = (point: Point): string => `${n(point.x)} ${n(point.y)}`;
	// Without an arrowhead, a straight piece covers the gap between the side and the curve.
	const bend = `C${p(curve.cp1)} ${p(curve.cp2)} ${p(end)}`;
	let path = fromEnd === 'arrow' ? `M${p(start)}${bend}` : `M${p(a)}L${p(start)}${bend}`;
	if (toEnd !== 'arrow') path += `L${p(b)}`;
	const arrows: EdgeTip[] = [];
	if (fromEnd === 'arrow') arrows.push({ at: a, side: fromSide });
	if (toEnd === 'arrow') arrows.push({ at: b, side: toSide });
	const extent: Point[] = [a, b];
	for (let i = 0; i <= 16; i++) extent.push(bezierPoint(curve, i / 16));
	return { path, curve, label: bezierPoint(curve, 0.5), arrows, extent };
}

/** How much an arrowhead grows with the line width (1 up to 2px, as Obsidian). */
export function arrowScale(width: number): number {
	return Math.max(1, (width + 2) / 4);
}

/** Arrowhead polygon points at `tip`, turned toward the node, scaled for the line width. */
export function arrowPolygon(tip: EdgeTip, width: number): Point[] {
	const scale = arrowScale(width);
	const radians = (ARROW_ROTATION[tip.side] * Math.PI) / 180;
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);
	return ARROW_POINTS.map((point) => ({
		x: round(tip.at.x + (point.x * cos - point.y * sin) * scale),
		y: round(tip.at.y + (point.x * sin + point.y * cos) * scale),
	}));
}

/** Dash pattern (dash, gap) of a line style at a width; null for solid lines. Dots use round caps. */
export function dashPattern(line: LineStyle, width: number): [number, number] | null {
	switch (line) {
		case 'dashed':
			return [round(width * 3 + 4), round(width * 2 + 4)];
		case 'dotted':
			return [0, round(width + 4)];
		case 'solid':
			return null;
	}
}

export function unionRect(rects: Rect[]): Rect | null {
	if (rects.length === 0) return null;
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const rect of rects) {
		minX = Math.min(minX, rect.x);
		minY = Math.min(minY, rect.y);
		maxX = Math.max(maxX, rect.x + rect.width);
		maxY = Math.max(maxY, rect.y + rect.height);
	}
	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function pointsRect(points: Point[]): Rect | null {
	return unionRect(points.map((point) => ({ x: point.x, y: point.y, width: 0, height: 0 })));
}

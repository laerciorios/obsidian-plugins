export const SHAPES = ['circle', 'square', 'diamond', 'triangle', 'hexagon'] as const;
export type Shape = (typeof SHAPES)[number];

/**
 * Size of each polygon relative to the node's radius, so shapes look about as big as the
 * circle: the square has the circle's area, the diamond touches the circle's box, the
 * triangle and hexagon are a bit larger than inscribed (they would look small otherwise).
 */
const SCALE: Record<Exclude<Shape, 'circle'>, number> = { square: 0.886, diamond: 1, triangle: 1.2, hexagon: 1.05 };

function regular(sides: number, startDeg: number, cx: number, cy: number, r: number): number[] {
	const points: number[] = [];
	for (let i = 0; i < sides; i++) {
		const angle = ((startDeg + (360 / sides) * i) * Math.PI) / 180;
		points.push(round(cx + r * Math.cos(angle)), round(cy + r * Math.sin(angle)));
	}
	return points;
}

function round(value: number): number {
	return Math.round(value * 1000) / 1000;
}

/** Polygon around (cx, cy) for a node of radius r, as flat [x0, y0, x1, y1, ...]; empty for a circle. */
export function shapePoints(shape: Shape, cx: number, cy: number, r: number): number[] {
	if (shape === 'circle') return [];
	const size = r * SCALE[shape];
	switch (shape) {
		case 'square':
			return [cx - size, cy - size, cx + size, cy - size, cx + size, cy + size, cx - size, cy + size].map(round);
		case 'diamond':
			return regular(4, -90, cx, cy, size);
		case 'triangle':
			// Pointing up, its centroid on the node's center.
			return regular(3, -90, cx, cy, size);
		case 'hexagon':
			return regular(6, 0, cx, cy, size);
	}
}

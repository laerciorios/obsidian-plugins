import { dashPattern, shapePaths } from '@obsidian-plugins/json-canvas-render';
import type { LineStyle, Shape } from '@obsidian-plugins/json-canvas-render';

/**
 * Toolbar icons drawn from the shared geometry, so the button shows the exact shape the card
 * gets. 20×20, stroked with the current text color.
 */

const BOX: Record<Shape, { x: number; y: number; width: number; height: number }> = {
	rectangle: { x: 1.5, y: 5, width: 17, height: 10 },
	square: { x: 3, y: 3, width: 14, height: 14 },
	circle: { x: 2.5, y: 2.5, width: 15, height: 15 },
	diamond: { x: 1.5, y: 1.5, width: 17, height: 17 },
	cylinder: { x: 4, y: 1.5, width: 12, height: 17 },
};

function iconSvg(): SVGSVGElement {
	return createSvg('svg', {
		cls: 'cs-icon',
		attr: { viewBox: '0 0 20 20', width: '20', height: '20', fill: 'none', stroke: 'currentColor', 'aria-hidden': 'true' },
	});
}

export function shapeIcon(shape: Shape): SVGSVGElement {
	const svg = iconSvg();
	const box = BOX[shape];
	const paths = shapePaths(shape, box.width, box.height, 2.5);
	const group = svg.createSvg('g', { attr: { transform: `translate(${box.x} ${box.y})`, 'stroke-width': '1.5', 'stroke-linejoin': 'round' } });
	for (const d of [paths.outline, ...paths.details]) group.createSvg('path', { attr: { d } });
	return svg;
}

export function lineIcon(line: LineStyle): SVGSVGElement {
	const svg = iconSvg();
	const dash = dashPattern(line, 1.5);
	svg.createSvg('path', {
		attr: {
			d: 'M2 10H18',
			'stroke-width': line === 'dotted' ? '2.2' : '1.8',
			'stroke-dasharray': dash ? dash.map((value) => (line === 'dotted' ? value : value * 0.55)).join(' ') : '',
			'stroke-linecap': line === 'dotted' ? 'round' : 'butt',
		},
	});
	return svg;
}

/** Thickness preview: the width in canvas px mapped to what fits in a 20px icon. */
export function widthIcon(width: number): SVGSVGElement {
	const svg = iconSvg();
	svg.createSvg('path', { attr: { d: 'M3 10H17', 'stroke-width': String(Math.min(6, 0.8 + width * 0.65)), 'stroke-linecap': 'round' } });
	return svg;
}

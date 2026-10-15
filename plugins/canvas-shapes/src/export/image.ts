import { contextMeasurer, renderCanvas } from '@obsidian-plugins/json-canvas-render';
import type { FileResource, RenderResult, TextMeasurer, ThemeName } from '@obsidian-plugins/json-canvas-render';
import { fitScale } from './plan';

/** SVG and PNG drawing of a canvas, in the browser (exact text measurement). */

export function browserMeasurer(): TextMeasurer {
	const context = createEl('canvas').getContext('2d');
	if (!context) throw new Error('No 2D canvas');
	return contextMeasurer(context);
}

export interface DrawOptions {
	theme: ThemeName;
	background: 'transparent' | 'solid';
	only?: string[];
	resources: Map<string, FileResource>;
	measure: TextMeasurer;
	title?: string;
	idPrefix?: string;
}

export function drawSvg(data: unknown, options: DrawOptions): RenderResult {
	return renderCanvas(data, {
		theme: options.theme,
		background: options.background,
		only: options.only,
		measure: options.measure,
		resolveFile: (path) => options.resources.get(path),
		title: options.title,
		idPrefix: options.idPrefix,
	});
}

export interface Png {
	data: ArrayBuffer;
	/** The scale used (lower than asked when the image would be too big for the browser). */
	scale: number;
}

/** Rasterize an SVG document with the browser: SVG → image → canvas → PNG. */
export async function svgToPng(svg: string, width: number, height: number, scale: number): Promise<Png> {
	const used = fitScale(width, height, scale);
	const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
	try {
		const img = createEl('img');
		img.src = url;
		await img.decode();
		const canvas = createEl('canvas');
		canvas.width = Math.max(1, Math.round(width * used));
		canvas.height = Math.max(1, Math.round(height * used));
		const context = canvas.getContext('2d');
		if (!context) throw new Error('No 2D canvas');
		context.drawImage(img, 0, 0, canvas.width, canvas.height);
		const blob = await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('PNG encoding failed'))), 'image/png');
		});
		return { data: await blob.arrayBuffer(), scale: used };
	} finally {
		URL.revokeObjectURL(url);
	}
}

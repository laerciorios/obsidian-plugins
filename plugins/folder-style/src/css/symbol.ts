import { SYMBOL_GAP } from '../constants';
import type { FolderSymbol, IconLookup, SvgLookup, SvgProblem } from '../types';
import { cssString } from './escape';

export type SymbolDeclarations =
	| { kind: 'ok'; declarations: string }
	| { kind: 'none' }
	| { kind: 'missing-icon' }
	| { kind: 'missing-svg'; problem: SvgProblem };

/** Where the symbol's markup comes from: Obsidian's Lucide icons and the vault's SVG files. */
export interface SymbolSources {
	iconSvg: IconLookup;
	vaultSvg: SvgLookup;
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/**
 * Declarations for the `::before` of the folder name. A Lucide icon is Obsidian's own SVG used
 * as a mask over a solid background, so it takes the folder or theme color instead of the
 * SVG's fixed stroke. A vault SVG keeps its own colors as a background image, or goes through
 * the same mask with `tint`.
 */
export function symbolDeclarations(
	symbol: FolderSymbol | undefined,
	channels: string | null,
	size: number,
	sources: SymbolSources,
): SymbolDeclarations {
	if (!symbol) return { kind: 'none' };
	const em = `${Number(size.toFixed(3))}em`;
	if (symbol.kind === 'text') {
		const text = symbol.value.trim();
		if (!text) return { kind: 'none' };
		const color = channels ? ` color: rgb(${channels});` : '';
		return { kind: 'ok', declarations: `content: ${cssString(text)};${color} font-size: ${em}; margin-inline-end: ${SYMBOL_GAP};` };
	}
	if (symbol.kind === 'lucide') {
		const svg = sources.iconSvg(symbol.value);
		return svg ? { kind: 'ok', declarations: maskDeclarations(svg, channels, em) } : { kind: 'missing-icon' };
	}
	const file = sources.vaultSvg(symbol.value);
	if (!file) return { kind: 'none' };
	if (!file.ok) return { kind: 'missing-svg', problem: file.problem };
	return { kind: 'ok', declarations: symbol.tint ? maskDeclarations(file.svg, channels, em) : imageDeclarations(file.svg, em) };
}

/**
 * The markup with the SVG namespace on its root element: an image loaded from a data URL is
 * parsed as XML and draws nothing without it, and SVGs written by hand often leave it out.
 */
export function withSvgNamespace(svg: string): string {
	const root = /<svg\b[^>]*>/i.exec(svg);
	if (!root || /\sxmlns\s*=/.test(root[0])) return svg;
	const at = root.index + '<svg'.length;
	return `${svg.slice(0, at)} xmlns="${SVG_NAMESPACE}"${svg.slice(at)}`;
}

/** The SVG as a CSS `url()` with a data URL. */
export function svgCssUrl(svg: string): string {
	return `url(${cssString(`data:image/svg+xml,${encodeURIComponent(withSvgNamespace(svg))}`)})`;
}

/** The `1em` box the symbol is drawn in, aligned with the folder name. */
function box(em: string): string[] {
	return ['content: "";', 'display: inline-block;', `width: ${em};`, `height: ${em};`, `margin-inline-end: ${SYMBOL_GAP};`, 'vertical-align: -0.15em;'];
}

function maskDeclarations(svg: string, channels: string | null, em: string): string {
	const url = svgCssUrl(svg);
	const paint = channels ? `rgb(${channels})` : 'currentColor';
	return [
		...box(em),
		`background-color: ${paint};`,
		`-webkit-mask-image: ${url};`,
		`mask-image: ${url};`,
		'-webkit-mask-size: contain;',
		'mask-size: contain;',
		'-webkit-mask-repeat: no-repeat;',
		'mask-repeat: no-repeat;',
		'-webkit-mask-position: center;',
		'mask-position: center;',
	].join(' ');
}

function imageDeclarations(svg: string, em: string): string {
	return [...box(em), `background-image: ${svgCssUrl(svg)};`, 'background-size: contain;', 'background-repeat: no-repeat;', 'background-position: center;'].join(' ');
}

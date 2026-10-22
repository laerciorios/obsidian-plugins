import { SYMBOL_GAP } from '../constants';
import type { FolderSymbol, IconLookup } from '../types';
import { cssString } from './escape';

export type SymbolDeclarations = { kind: 'ok'; declarations: string } | { kind: 'none' } | { kind: 'missing-icon' };

/**
 * Declarations for the `::before` of the folder name. A Lucide icon is Obsidian's own SVG used
 * as a mask over a solid background, so it takes the folder or theme color instead of the
 * SVG's fixed stroke.
 */
export function symbolDeclarations(
	symbol: FolderSymbol | undefined,
	channels: string | null,
	size: number,
	iconSvg: IconLookup,
): SymbolDeclarations {
	if (!symbol) return { kind: 'none' };
	const em = `${Number(size.toFixed(3))}em`;
	if (symbol.kind === 'text') {
		const text = symbol.value.trim();
		if (!text) return { kind: 'none' };
		const color = channels ? ` color: rgb(${channels});` : '';
		return { kind: 'ok', declarations: `content: ${cssString(text)};${color} font-size: ${em}; margin-inline-end: ${SYMBOL_GAP};` };
	}
	const svg = iconSvg(symbol.value);
	if (!svg) return { kind: 'missing-icon' };
	const url = `url(${cssString(`data:image/svg+xml,${encodeURIComponent(svg)}`)})`;
	const paint = channels ? `rgb(${channels})` : 'currentColor';
	return {
		kind: 'ok',
		declarations: [
			'content: "";',
			'display: inline-block;',
			`width: ${em};`,
			`height: ${em};`,
			`margin-inline-end: ${SYMBOL_GAP};`,
			'vertical-align: -0.15em;',
			`background-color: ${paint};`,
			`-webkit-mask-image: ${url};`,
			`mask-image: ${url};`,
			'-webkit-mask-size: contain;',
			'mask-size: contain;',
			'-webkit-mask-repeat: no-repeat;',
			'mask-repeat: no-repeat;',
			'-webkit-mask-position: center;',
			'mask-position: center;',
		].join(' '),
	};
}

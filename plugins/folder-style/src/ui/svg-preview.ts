import { CLS, SVG_MAX_BYTES, SVG_URL_VAR } from '../constants';
import { svgCssUrl } from '../css/symbol';
import { t } from '../i18n';
import type { SvgProblem } from '../types';

/** A vault SVG at icon size: its own colors, or with `tint` the current text color (styles.css). */
export function createSvgPreview(parent: HTMLElement, svg: string, tint: boolean, cls: string[] = []): HTMLElement {
	const el = parent.createSpan({ cls: [CLS.svg, ...(tint ? [CLS.svgTint] : []), ...cls] });
	el.setCssProps({ [SVG_URL_VAR]: svgCssUrl(svg) });
	return el;
}

/** The file name of a vault path, for labels. */
export function fileName(path: string): string {
	return path.split('/').pop() ?? path;
}

/** The warning for a vault SVG that cannot be drawn. */
export function svgProblemText(problem: SvgProblem, path: string): string {
	if (problem === 'missing') return t('folder.svg.missing', { path });
	if (problem === 'empty') return t('folder.svg.empty', { path });
	return t('folder.svg.tooLarge', { path, size: SVG_MAX_BYTES / 1024 });
}

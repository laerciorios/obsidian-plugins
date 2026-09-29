import type { MarkdownPostProcessor } from 'obsidian';
import { CLS, COLOR_VAR } from '../constants';
import type { Palette } from '../palette';
import { LEADING_TOKEN } from '../syntax';

/**
 * Reading view, embeds, hover previews and PDF export: Obsidian renders
 * =={red}text== as <mark>{red}text</mark>. The marker is removed from the
 * rendered text (never from the note) and the color goes on the <mark>.
 */
export function colorMarks(palette: () => Palette): MarkdownPostProcessor {
	return (el) => {
		for (const mark of Array.from(el.querySelectorAll('mark'))) paint(mark, palette());
	};
}

function paint(mark: HTMLElement, palette: Palette): void {
	if (mark.hasClass(CLS.color)) return;
	const first = mark.firstChild;
	if (!first || first.nodeType !== Node.TEXT_NODE) return;
	const text = first.textContent ?? '';
	const match = LEADING_TOKEN.exec(text);
	const token = match?.[1];
	if (!match || !token) return;
	const color = palette.resolve(token);
	if (!color) return;
	// "=={red}==" shows as typed, like in the editor.
	if ((mark.textContent ?? '').length === match[0].length) return;
	first.textContent = text.slice(match[0].length);
	mark.addClasses([CLS.color, CLS.style(color.style)]);
	mark.setCssProps({ [COLOR_VAR]: color.color });
}

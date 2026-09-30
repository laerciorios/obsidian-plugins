import { renderMath } from 'obsidian';
import type { Inline } from '../syntax';
import type { Layout, Line } from './lines';

export interface DrawOptions {
	/** Width of an indentation level, in em. */
	indent: number;
	/** Text after each line number ("1:"). */
	punctuation: string;
}

/** Inline content → DOM. Math goes through Obsidian's MathJax (call `finishRenderMath` afterwards). */
export function drawInline(parent: HTMLElement, content: Inline[]): void {
	for (const item of content) {
		switch (item.kind) {
			case 'text':
				parent.appendText(item.text);
				break;
			case 'space':
				parent.appendText(' ');
				break;
			case 'math':
				parent.appendChild(renderMath(item.tex, item.display));
				break;
			case 'word':
				parent.createSpan({ cls: `psc-${item.style}`, text: item.text });
				break;
			case 'keyword':
				parent.createSpan({ cls: 'psc-keyword', text: item.keyword });
				break;
			case 'call':
				drawInline(parent.createSpan({ cls: 'psc-function' }), item.name);
				parent.appendText('(');
				drawInline(parent, item.args);
				parent.appendText(')');
				break;
			case 'styled':
				drawInline(parent.createSpan({ cls: `psc-style-${item.command}` }), item.children);
				break;
			case 'break':
				parent.createEl('br');
				break;
		}
	}
}

function drawLine(parent: HTMLElement, line: Line, options: DrawOptions): void {
	const row = parent.createDiv({ cls: ['psc-line', `psc-line-${line.kind}`] });
	if (line.kind !== 'io') {
		row.createSpan({ cls: 'psc-number', text: line.number === null ? '' : `${line.number}${options.punctuation}` });
	}
	for (let level = 0; level < line.depth; level++) row.createSpan({ cls: 'psc-indent' });
	drawInline(row.createSpan({ cls: 'psc-content' }), line.content);
	if (line.comment) drawInline(row.createSpan({ cls: 'psc-comment' }), line.comment);
}

/** Draw the algorithms of a block into `parent`. */
export function drawLayouts(parent: HTMLElement, layouts: Layout[], options: DrawOptions): void {
	const root = parent.createDiv({ cls: 'psc-root' });
	root.setCssProps({ '--psc-indent': `${options.indent}em` });
	for (const layout of layouts) {
		const algorithm = root.createDiv({ cls: 'psc-algorithm' });
		algorithm.toggleClass('psc-float', layout.float);
		algorithm.toggleClass('psc-numbered', layout.style.lineNumbers > 0);
		algorithm.toggleClass('psc-scope-lines', layout.style.scopeLines);
		if (layout.caption) drawInline(algorithm.createDiv({ cls: 'psc-caption' }), layout.caption);
		const lines = algorithm.createDiv({ cls: 'psc-lines' });
		for (const line of layout.lines) drawLine(lines, line, options);
	}
}

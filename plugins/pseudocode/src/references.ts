import { syntaxTree } from '@codemirror/language';
import { Prec, RangeSetBuilder } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { MarkdownRenderChild, MarkdownView, TFile, editorLivePreviewField, setTooltip } from 'obsidian';
import type { App, Plugin } from 'obsidian';
import { t } from './i18n';
import { KEYWORDS } from './render/keywords';
import { findLabel } from './render/numbering';
import type { PseudocodeSettings } from './settings/settings';

/** `\ref{label}` → "3"; `\autoref{label}` → "Algorithm 3", as in LaTeX with hyperref. */
const REFERENCE = /^\\(ref|autoref)\s*\{\s*([^{}]+?)\s*\}$/;

export interface ReferenceHost extends Plugin {
	settings: PseudocodeSettings;
	/** Reading-view references on screen, redrawn when a setting changes. */
	references: Set<ReferenceChild>;
}

interface Resolved {
	text: string;
	tooltip: string;
	/** 0-based line of the block, or null when the label does not exist. */
	line: number | null;
}

function resolve(noteText: string, kind: string, label: string, settings: PseudocodeSettings): Resolved {
	const found = findLabel(noteText, label);
	if (!found) return { text: '??', tooltip: t('ref.missing', { label }), line: null };
	const title = `${KEYWORDS[settings.keywords].algorithm} ${found.number}`;
	return { text: kind === 'autoref' ? title : String(found.number), tooltip: t('ref.goTo', { title }), line: found.block.lineStart };
}

function drawReference(el: HTMLElement, resolved: Resolved): void {
	el.empty();
	el.setText(resolved.text);
	el.toggleClass('psc-ref-missing', resolved.line === null);
	setTooltip(el, resolved.tooltip);
}

/** A reference in reading view: inline code replaced by a link to the algorithm. */
export class ReferenceChild extends MarkdownRenderChild {
	private line: number | null = null;

	constructor(
		containerEl: HTMLElement,
		private readonly host: ReferenceHost,
		private readonly sourcePath: string,
		private readonly kind: string,
		private readonly label: string,
	) {
		super(containerEl);
	}

	onload(): void {
		this.host.references.add(this);
		this.registerEvent(
			this.host.app.metadataCache.on('changed', (file) => {
				if (file.path === this.sourcePath) this.refresh();
			}),
		);
		this.registerDomEvent(this.containerEl, 'click', (event) => {
			event.preventDefault();
			if (this.line === null) return;
			const view = this.host.app.workspace.getActiveViewOfType(MarkdownView);
			if (view?.file?.path === this.sourcePath) view.setEphemeralState({ line: this.line });
		});
		this.refresh();
	}

	onunload(): void {
		this.host.references.delete(this);
	}

	refresh(): void {
		const file = this.host.app.vault.getAbstractFileByPath(this.sourcePath);
		if (!(file instanceof TFile)) return;
		void this.host.app.vault.cachedRead(file).then((text) => {
			const resolved = resolve(text, this.kind, this.label, this.host.settings);
			this.line = resolved.line;
			drawReference(this.containerEl, resolved);
		});
	}
}

class ReferenceWidget extends WidgetType {
	constructor(private readonly resolved: Resolved) {
		super();
	}

	eq(other: ReferenceWidget): boolean {
		return (
			other.resolved.text === this.resolved.text &&
			other.resolved.line === this.resolved.line &&
			other.resolved.tooltip === this.resolved.tooltip
		);
	}

	toDOM(view: EditorView): HTMLElement {
		const el = createSpan({ cls: ['psc-ref', 'psc-ref-editor'] });
		drawReference(el, this.resolved);
		el.addEventListener('mousedown', (event) => {
			event.preventDefault();
			const line = this.resolved.line;
			if (line === null) return;
			const position = view.state.doc.line(Math.min(line + 1, view.state.doc.lines)).from;
			view.dispatch({ effects: EditorView.scrollIntoView(position, { y: 'start', yMargin: 48 }) });
		});
		return el;
	}

	/** The editor leaves clicks to the widget, so clicking follows the link instead of opening the code. */
	ignoreEvent(): boolean {
		return true;
	}
}

/** Inline code `\ref{...}` in live preview, shown as the link unless the cursor is on it. */
function referenceDecorations(view: EditorView, settings: PseudocodeSettings): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	if (!view.state.field(editorLivePreviewField)) return builder.finish();
	const doc = view.state.doc;
	let text: string | null = null;
	const selection = view.state.selection.ranges;
	for (const { from, to } of view.visibleRanges) {
		syntaxTree(view.state).iterate({
			from,
			to,
			enter: (node) => {
				if (!node.name.includes('inline-code') || node.name.includes('formatting')) return;
				const match = REFERENCE.exec(doc.sliceString(node.from, node.to).trim());
				if (!match) return;
				let start = node.from;
				let end = node.to;
				while (start > 0 && doc.sliceString(start - 1, start) === '`') start--;
				while (end < doc.length && doc.sliceString(end, end + 1) === '`') end++;
				if (selection.some((range) => range.from <= end && range.to >= start)) return;
				text ??= doc.toString();
				const widget = new ReferenceWidget(resolve(text, match[1]!, match[2]!, settings));
				builder.add(start, end, Decoration.replace({ widget }));
			},
		});
	}
	return builder.finish();
}

/** Highest precedence: live preview hides the backticks with its own decorations, which would cut this one. */
function referenceExtension(host: ReferenceHost): Extension {
	return Prec.highest(ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = referenceDecorations(view, host.settings);
			}

			update(update: ViewUpdate): void {
				const reconfigured = update.transactions.some((transaction) => transaction.reconfigured);
				if (update.docChanged || update.viewportChanged || update.selectionSet || reconfigured) {
					this.decorations = referenceDecorations(update.view, host.settings);
				}
			}
		},
		{ decorations: (plugin) => plugin.decorations },
	));
}

/** `\ref`/`\autoref` in reading view (post-processor) and live preview (editor extension). */
export function registerReferences(host: ReferenceHost): void {
	host.registerMarkdownPostProcessor((el, ctx) => {
		for (const code of Array.from(el.querySelectorAll('code'))) {
			if (code.closest('pre')) continue;
			const match = REFERENCE.exec((code.textContent ?? '').trim());
			if (!match) continue;
			const link = createEl('a', { cls: ['psc-ref', 'internal-link'] });
			code.replaceWith(link);
			ctx.addChild(new ReferenceChild(link, host, ctx.sourcePath, match[1]!, match[2]!));
		}
	});
	host.registerEditorExtension(referenceExtension(host));
}

/** Redraw every reference after a setting changed (the keyword language names "Algorithm"). */
export function refreshReferences(app: App, host: ReferenceHost): void {
	for (const reference of host.references) reference.refresh();
	app.workspace.updateOptions();
}

import { EditorView } from '@codemirror/view';
import { MarkdownRenderChild, finishRenderMath, loadMathJax, setIcon } from 'obsidian';
import type { App, MarkdownPostProcessorContext } from 'obsidian';
import { copyAlgorithms } from './export/clipboard';
import { t } from './i18n';
import type { MessageKey } from './i18n';
import { drawLayouts } from './render/dom';
import { layout } from './render/lines';
import { scanNote } from './render/numbering';
import { baseStyle } from './settings/settings';
import type { PseudocodeSettings } from './settings/settings';
import { PseudocodeError, parse } from './syntax';
import type { Algorithm } from './syntax';

export interface BlockHost {
	app: App;
	settings: PseudocodeSettings;
	/** Blocks on screen, redrawn when a setting changes. */
	blocks: Set<PseudocodeBlock>;
}

/** Message of a syntax error, translated. */
export function errorMessage(error: PseudocodeError): string {
	const message =
		error.code === 'endOfBlock' && !error.params.expected
			? t('error.endOfBlockEmpty')
			: t(`error.${error.code}` as MessageKey, error.params);
	return t('error.line', { line: error.line, message });
}

/** The error, then the source with the faulty line marked, so the note stays readable. */
function drawError(el: HTMLElement, source: string, message: string, line: number | null): void {
	const box = el.createDiv({ cls: 'psc-error' });
	box.createDiv({ cls: 'psc-error-title', text: t('error.title') });
	box.createDiv({ cls: 'psc-error-message', text: message });
	const code = box.createEl('pre', { cls: 'psc-error-source' }).createEl('code');
	source.split('\n').forEach((text, index) => {
		code.createSpan({ cls: ['psc-error-line', ...(index + 1 === line ? ['is-error'] : [])], text: `${text}\n` });
	});
}

/** One rendered ```pseudo block. Obsidian creates a new one whenever the block's text changes. */
export class PseudocodeBlock extends MarkdownRenderChild {
	private algorithms: Algorithm[] = [];
	private error: { message: string; line: number | null } | null = null;
	/** Number of the first captioned algorithm, as last drawn. */
	private number: number | null = null;
	/** Increases on every draw; a draw that waited for MathJax gives up if a newer one started. */
	private run = 0;

	constructor(
		containerEl: HTMLElement,
		private readonly host: BlockHost,
		private readonly source: string,
		private readonly ctx: MarkdownPostProcessorContext,
	) {
		super(containerEl);
	}

	onload(): void {
		this.host.blocks.add(this);
		try {
			this.algorithms = parse(this.source);
		} catch (error) {
			if (error instanceof PseudocodeError) this.error = { message: errorMessage(error), line: error.line };
			else {
				console.error('Pseudocode: render failed', error);
				this.error = { message: String(error), line: null };
			}
		}
		// A block added or removed above changes the numbers of the ones below.
		if (this.algorithms.some((algorithm) => algorithm.caption)) {
			const renumber = (path: string | undefined) => {
				if (path === this.ctx.sourcePath && this.firstNumber() !== this.number) this.refresh();
			};
			this.registerEvent(this.host.app.metadataCache.on('changed', (file) => renumber(file.path)));
			// Live preview: right away, without waiting for the note to be saved and indexed.
			this.registerEvent(this.host.app.workspace.on('editor-change', (_editor, info) => renumber(info.file?.path)));
		}
		// Live preview: a click on the rendered block opens its source, as in the community plugin.
		this.registerDomEvent(this.containerEl, 'click', (event) => {
			if (!(event.target instanceof HTMLElement) || event.target.closest('.psc-copy, a')) return;
			if (!activeWindow.getSelection()?.isCollapsed) return;
			const edit = this.containerEl.closest('.cm-embed-block')?.querySelector<HTMLElement>('.edit-block-button');
			edit?.click();
		});
		this.refresh();
	}

	onunload(): void {
		this.host.blocks.delete(this);
		this.run++;
	}

	refresh(): void {
		void this.draw();
	}

	/**
	 * Position of this block's first algorithm among the captioned algorithms of the note.
	 * Live preview: the block's place in the editor (section info goes stale after edits there).
	 * Reading view: the section info.
	 */
	private firstNumber(): number | null {
		const editor = this.containerEl.isConnected ? EditorView.findFromDOM(this.containerEl) : null;
		if (editor) {
			const line = editor.state.doc.lineAt(editor.posAtDOM(this.containerEl)).number - 1;
			const block = scanNote(editor.state.doc.toString()).find((candidate) => candidate.lineStart <= line && line <= candidate.lineEnd);
			return block?.first ?? null;
		}
		const info = this.ctx.getSectionInfo(this.containerEl);
		if (!info) return null;
		return scanNote(info.text).find((block) => block.lineStart === info.lineStart)?.first ?? null;
	}

	private async draw(): Promise<void> {
		const run = ++this.run;
		const el = this.containerEl;
		el.addClass('psc-block');
		if (this.error) {
			el.empty();
			drawError(el, this.source, this.error.message, this.error.line);
			return;
		}
		if (this.algorithms.length === 0) {
			el.empty();
			el.createDiv({ cls: 'psc-empty', text: t('block.empty') });
			return;
		}
		await loadMathJax();
		if (run !== this.run) return;
		const settings = this.host.settings;
		this.number = this.firstNumber();
		let next = settings.numberAlgorithms ? this.number : null;
		const base = baseStyle(settings);
		const layouts = this.algorithms.map((algorithm) =>
			layout(algorithm, base, algorithm.caption && next !== null ? next++ : null),
		);
		el.empty();
		drawLayouts(el, layouts, { indent: settings.indent, punctuation: settings.punctuation });
		const copy = el.createDiv({ cls: ['psc-copy', 'clickable-icon'], attr: { 'aria-label': t('block.copy') } });
		setIcon(copy, 'clipboard-copy');
		copy.onClickEvent((event) => {
			event.stopPropagation();
			void copyAlgorithms(this.algorithms, this.host.settings);
		});
		await finishRenderMath();
		// Live preview may draw a new block before it is in the editor: number it once it is.
		if (this.number === null && this.algorithms.some((algorithm) => algorithm.caption)) {
			window.requestAnimationFrame(() => {
				if (run === this.run && this.containerEl.isConnected && this.firstNumber() !== null) this.refresh();
			});
		}
	}
}

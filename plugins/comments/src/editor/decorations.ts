import { StateEffect } from '@codemirror/state';
import type { EditorState, Extension, Range } from '@codemirror/state';
import { Decoration, ViewPlugin, WidgetType } from '@codemirror/view';
import type { DecorationSet, EditorView, ViewUpdate } from '@codemirror/view';
import { editorInfoField, editorLivePreviewField, setIcon, setTooltip } from 'obsidian';
import { locate } from '../anchor/locate';
import type { Location } from '../anchor/locate';
import { CLS, ICON } from '../constants';
import { t } from '../i18n';
import { locateRequest, openThreads } from '../model/threads';
import type { CommentStore } from '../store/store';
import type { CommentsSettings } from '../types';

export interface DecorationHost {
	settings: CommentsSettings;
	store: CommentStore;
	revealThread(notePath: string, anchor: string): Promise<void>;
}

/**
 * Open conversations in the editor: their quoted passage is highlighted (the
 * whole block when the quote no longer matches) and, in Live Preview, the
 * block id becomes a comment icon that opens the conversation in the panel.
 * Like Obsidian's own formatting, the id shows again while the selection is
 * on its line, so it can still be edited.
 */

const refresh = StateEffect.define<null>();
/** Every editor with the extension, to redraw them when comments change. */
const views = new Set<EditorView>();

/** Redraw every editor: call after comments or the highlight setting change. */
export function refreshEditors(): void {
	for (const view of views) view.dispatch({ effects: refresh.of(null) });
}

const HIGHLIGHT = Decoration.mark({ class: CLS.highlight });

class AnchorWidget extends WidgetType {
	constructor(
		readonly notePath: string,
		readonly anchor: string,
		private readonly host: DecorationHost,
	) {
		super();
	}

	eq(other: AnchorWidget): boolean {
		return other.notePath === this.notePath && other.anchor === this.anchor;
	}

	toDOM(): HTMLElement {
		const el = createSpan({ cls: CLS.anchorIcon, attr: { role: 'button' } });
		setIcon(el, ICON);
		setTooltip(el, t('editor.openThread'));
		el.addEventListener('mousedown', (event) => {
			event.preventDefault();
			event.stopPropagation();
			void this.host.revealThread(this.notePath, this.anchor);
		});
		return el;
	}

	/** Clicks are handled by the icon, not by the editor (no cursor move). */
	ignoreEvent(): boolean {
		return true;
	}
}

function livePreview(state: EditorState): boolean {
	return state.field(editorLivePreviewField, false) === true;
}

export function commentDecorations(host: DecorationHost): Extension {
	class CommentsView {
		decorations: DecorationSet = Decoration.none;
		private notePath: string | null = null;
		private located: Array<{ anchor: string; location: Location }> = [];

		constructor(private readonly view: EditorView) {
			views.add(view);
			this.locate();
			this.build();
		}

		update(update: ViewUpdate): void {
			const refreshed = update.transactions.some((tr) => tr.effects.some((effect) => effect.is(refresh)));
			if (update.docChanged || refreshed) {
				this.locate();
				this.build();
			} else if (
				this.located.length > 0 &&
				(update.selectionSet || update.focusChanged || livePreview(update.state) !== livePreview(update.startState))
			) {
				this.build();
			}
		}

		destroy(): void {
			views.delete(this.view);
		}

		/** Find the passages: only when the text or the comments change. */
		private locate(): void {
			this.located = [];
			const file = this.view.state.field(editorInfoField, false)?.file;
			this.notePath = file?.path ?? null;
			if (!file || !host.settings.highlight) return;
			const threads = openThreads(host.store.threads(file.path));
			if (threads.length === 0) return;
			const found = locate(this.view.state.doc.toString(), threads.map(locateRequest));
			for (const thread of threads) {
				const location = found.get(thread.anchor.toLowerCase());
				if (location) this.located.push({ anchor: thread.anchor, location });
			}
		}

		/** Decorations from the passages found: cheap, runs on selection changes. */
		private build(): void {
			const { state } = this.view;
			const notePath = this.notePath;
			if (this.located.length === 0 || !notePath) {
				this.decorations = Decoration.none;
				return;
			}
			const icons = livePreview(state);
			// Obsidian shows formatting only in the focused editor.
			const selection = this.view.hasFocus ? state.selection.ranges : [];
			const ranges: Range<Decoration>[] = [];
			for (const { anchor, location } of this.located) {
				for (const span of location.highlights) ranges.push(HIGHLIGHT.range(span.from, span.to));
				if (!icons) continue;
				const line = state.doc.lineAt(location.id.from);
				if (selection.some((range) => range.from <= line.to && range.to >= line.from)) continue;
				const widget = Decoration.replace({ widget: new AnchorWidget(notePath, anchor, host) });
				ranges.push(widget.range(location.id.from, location.id.to));
			}
			this.decorations = Decoration.set(ranges, true);
		}
	}

	return ViewPlugin.fromClass(CommentsView, { decorations: (value) => value.decorations });
}

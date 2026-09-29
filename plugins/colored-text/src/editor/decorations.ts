import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState, Extension } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { editorLivePreviewField } from 'obsidian';
import { CLS, COLOR_VAR } from '../constants';
import type { Palette } from '../palette';
import { findHighlights } from '../syntax';
import type { ResolvedColor } from '../types';

/**
 * Colors =={token}text== in Live Preview and source mode. Obsidian already
 * parses and draws the highlight; this plugin only adds, on top of it:
 *
 * - an outer mark over the whole highlight carrying the color. Outer
 *   decorations wrap Obsidian's own token spans (span.cm-highlight), so the
 *   stylesheet can recolor them through the variables they read;
 * - on the {token}: hidden in Live Preview unless the focused editor has the
 *   selection on the highlight (the same rule Obsidian uses for the "=="),
 *   faint otherwise and always faint in source mode.
 *
 * Every match is checked against the syntax tree: both "==" must be
 * Obsidian's highlight delimiters, which rules out code, math and frontmatter.
 */

const HIDDEN = Decoration.replace({});
const MARKER = Decoration.mark({ class: CLS.marker });

function isDelimiter(state: EditorState, pos: number): boolean {
	return syntaxTree(state).resolveInner(pos, 1).name.includes('formatting-highlight');
}

function livePreview(state: EditorState): boolean {
	return state.field(editorLivePreviewField, false) === true;
}

/** The extension for one palette. A palette change registers a new one (see main.ts). */
export function colorDecorations(palette: Palette): Extension {
	const marks = new Map<string, Decoration>();
	const markFor = ({ color, style }: ResolvedColor): Decoration => {
		const key = `${style} ${color}`;
		let mark = marks.get(key);
		if (!mark) {
			mark = Decoration.mark({
				class: `${CLS.color} ${CLS.style(style)}`,
				attributes: { style: `${COLOR_VAR}: ${color}` },
			});
			marks.set(key, mark);
		}
		return mark;
	};

	class ColorView {
		outer: DecorationSet = Decoration.none;
		inner: DecorationSet = Decoration.none;

		constructor(view: EditorView) {
			this.build(view);
		}

		update(update: ViewUpdate): void {
			if (
				update.docChanged ||
				update.viewportChanged ||
				update.selectionSet ||
				update.focusChanged ||
				syntaxTree(update.state) !== syntaxTree(update.startState) ||
				livePreview(update.state) !== livePreview(update.startState)
			) {
				this.build(update.view);
			}
		}

		private build(view: EditorView): void {
			const { state } = view;
			const hideMarkers = livePreview(state);
			// Obsidian hides formatting whenever the editor is not focused.
			const selection = view.hasFocus ? state.selection.ranges : [];
			const outer = new RangeSetBuilder<Decoration>();
			const inner = new RangeSetBuilder<Decoration>();
			let nextLine = 1;
			for (const visible of view.visibleRanges) {
				const first = Math.max(state.doc.lineAt(visible.from).number, nextLine);
				const last = state.doc.lineAt(visible.to).number;
				for (let number = first; number <= last; number++) {
					const line = state.doc.line(number);
					if (!line.text.includes('=={')) continue;
					for (const highlight of findHighlights(line.text)) {
						// "=={red}==" has nothing to color yet: the marker stays visible while typing.
						if (highlight.token === null || highlight.tokenTo === highlight.innerTo) continue;
						const color = palette.resolve(highlight.token);
						if (!color) continue;
						const from = line.from + highlight.from;
						const to = line.from + highlight.to;
						if (!isDelimiter(state, from) || !isDelimiter(state, to - 2)) continue;
						outer.add(from, to, markFor(color));
						const editing = selection.some((range) => range.from <= to && range.to >= from);
						inner.add(line.from + highlight.innerFrom, line.from + highlight.tokenTo, hideMarkers && !editing ? HIDDEN : MARKER);
					}
				}
				nextLine = last + 1;
			}
			this.outer = outer.finish();
			this.inner = inner.finish();
		}
	}

	return ViewPlugin.fromClass(ColorView, {
		decorations: (value) => value.inner,
		provide: (plugin) =>
			EditorView.outerDecorations.of((view) => view.plugin(plugin)?.outer ?? Decoration.none),
	});
}

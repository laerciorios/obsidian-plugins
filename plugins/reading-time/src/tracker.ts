import { MarkdownView, debounce } from 'obsidian';
import type { Editor, Plugin, TFile } from 'obsidian';
import { EDIT_DEBOUNCE_MS, SELECTION_DEBOUNCE_MS } from './constants';
import { CountedText } from './count';
import type { Range } from './count';
import { selectionListener } from './editor/selection';
import { estimate } from './estimate';
import { details, displayText } from './format';
import { t } from './i18n';
import type { Estimate, ReadingTimeSettings } from './types';
import { StatusBar } from './ui/status-bar';

export interface TrackerHost extends Plugin {
	settings: ReadingTimeSettings;
}

/** The active note measured now: the whole note and, while text is selected, the selection. */
export interface Reading {
	file: TFile | null;
	note: Estimate;
	selection: Estimate | null;
}

function selectedRanges(editor: Editor): Range[] {
	return editor
		.listSelections()
		.map(({ anchor, head }) => {
			const a = editor.posToOffset(anchor);
			const b = editor.posToOffset(head);
			return { from: Math.min(a, b), to: Math.max(a, b) };
		})
		.filter((range) => range.to > range.from);
}

/** Keeps the status bar in step with the active note. */
export class ReadingTimeTracker {
	/** The last text counted: selection changes and layout events reuse it. */
	private counted: CountedText | null = null;
	private countedSkip = '';
	private readonly editSoon = debounce(() => this.refresh(), EDIT_DEBOUNCE_MS, true);
	private readonly selectionSoon = debounce(() => this.refresh(), SELECTION_DEBOUNCE_MS, true);
	private bar: StatusBar | null = null;

	constructor(private readonly plugin: TrackerHost) {}

	register(): void {
		const { workspace, vault } = this.plugin.app;
		this.bar = new StatusBar(this.plugin.addStatusBarItem());
		const refresh = () => this.refresh();
		this.plugin.registerEvent(workspace.on('active-leaf-change', refresh));
		this.plugin.registerEvent(workspace.on('file-open', refresh));
		// Also fires when a note switches between reading and editing.
		this.plugin.registerEvent(workspace.on('layout-change', refresh));
		this.plugin.registerEvent(workspace.on('editor-change', () => this.editSoon()));
		// Changes that do not go through the editor: sync, other plugins, the reading view.
		this.plugin.registerEvent(
			vault.on('modify', (file) => {
				if (file === this.activeView()?.file) this.editSoon();
			}),
		);
		this.plugin.registerEditorExtension(
			selectionListener(() => {
				if (this.plugin.settings.selection) this.selectionSoon();
			}),
		);
		workspace.onLayoutReady(refresh);
	}

	cancel(): void {
		this.editSoon.cancel();
		this.selectionSoon.cancel();
	}

	refresh(): void {
		const bar = this.bar;
		if (!bar) return;
		const reading = this.read();
		const settings = this.plugin.settings;
		const shown = reading?.selection ?? reading?.note;
		const empty = !reading?.selection && !!shown && shown.words + shown.codeWords === 0;
		const text = shown ? displayText(shown, settings) : '';
		if (!shown || !text || (empty && settings.hideEmpty)) {
			bar.hide();
			return;
		}
		bar.show(reading?.selection ? t('status.selection', { text }) : text, details(shown, settings));
	}

	read(): Reading | null {
		const view = this.activeView();
		if (!view) return null;
		const settings = this.plugin.settings;
		const editing = view.getMode() === 'source';
		const counted = this.count(editing ? view.editor.getValue() : view.getViewData());
		let selection: Estimate | null = null;
		if (editing && settings.selection) {
			const ranges = selectedRanges(view.editor);
			if (ranges.length > 0) selection = estimate(counted.count(ranges), settings);
		}
		return { file: view.file, note: estimate(counted.total, settings), selection };
	}

	/** The note in focus; while a sidebar has focus, the note last used in the main area. */
	private activeView(): MarkdownView | null {
		const { workspace } = this.plugin.app;
		const active = workspace.getActiveViewOfType(MarkdownView);
		if (active) return active;
		const recent = workspace.getMostRecentLeaf()?.view;
		return recent instanceof MarkdownView ? recent : null;
	}

	private count(text: string): CountedText {
		const skip = this.plugin.settings.code.skipLanguages;
		const key = skip.join(',');
		if (this.counted?.text !== text || this.countedSkip !== key) {
			this.counted = new CountedText(text, new Set(skip));
			this.countedSkip = key;
		}
		return this.counted;
	}
}

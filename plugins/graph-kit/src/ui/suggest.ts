import { AbstractInputSuggest, TFile } from 'obsidian';
import type { App } from 'obsidian';

const LIMIT = 50;

/** Suggests from a fixed list of strings, matching anywhere, ignoring case. */
class ListSuggest extends AbstractInputSuggest<string> {
	constructor(
		app: App,
		private readonly input: HTMLInputElement,
		private readonly items: () => string[],
		private readonly picked: (value: string) => void,
	) {
		super(app, input);
		this.limit = LIMIT;
	}

	protected getSuggestions(query: string): string[] {
		const wanted = query.trim().toLowerCase();
		return this.items().filter((item) => item.toLowerCase().includes(wanted));
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.setText(value);
	}

	selectSuggestion(value: string): void {
		this.setValue(value);
		this.input.dispatchEvent(new Event('input'));
		this.picked(value);
		this.close();
	}
}

export function suggestFolders(app: App, input: HTMLInputElement, picked: (value: string) => void = () => undefined): void {
	new ListSuggest(app, input, () => app.vault.getAllFolders(false).map((folder) => folder.path).sort((a, b) => a.localeCompare(b)), picked);
}

/** Frontmatter keys used in the vault, read from the metadata cache once per input. */
export function suggestProperties(app: App, input: HTMLInputElement, picked: (value: string) => void = () => undefined): void {
	let keys: string[] | null = null;
	const list = () => {
		if (keys) return keys;
		const found = new Set<string>();
		for (const file of app.vault.getMarkdownFiles()) {
			const frontmatter: unknown = app.metadataCache.getFileCache(file)?.frontmatter;
			if (frontmatter && typeof frontmatter === 'object') for (const key of Object.keys(frontmatter)) found.add(key);
		}
		keys = [...found].sort((a, b) => a.localeCompare(b));
		return keys;
	};
	new ListSuggest(app, input, list, picked);
}

export function suggestJsonFiles(app: App, input: HTMLInputElement, picked: (value: string) => void = () => undefined): void {
	new ListSuggest(
		app,
		input,
		() =>
			app.vault
				.getFiles()
				.filter((file: TFile) => file.extension === 'json')
				.map((file) => file.path)
				.sort((a, b) => a.localeCompare(b)),
		picked,
	);
}

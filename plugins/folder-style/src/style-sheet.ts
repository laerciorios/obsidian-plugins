/**
 * The plugin's stylesheet, rewritten whole on every change. A constructed sheet in each
 * window's `document.adoptedStyleSheets` rather than a `<style>` element: nothing is added to
 * the DOM (Obsidian's guidelines forbid plugin `<style>` elements; `styles.css` cannot be
 * per-user). A sheet can only be adopted by the document of the window that built it, so
 * popout windows get their own.
 */
export class FolderStyleSheet {
	private css = '';
	private readonly sheets = new Map<Document, CSSStyleSheet>();

	attach(doc: Document): void {
		const win = doc.defaultView;
		if (!win || this.sheets.has(doc)) return;
		const sheet = new win.CSSStyleSheet();
		sheet.replaceSync(this.css);
		doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
		this.sheets.set(doc, sheet);
	}

	detach(doc: Document): void {
		const sheet = this.sheets.get(doc);
		if (!sheet) return;
		doc.adoptedStyleSheets = doc.adoptedStyleSheets.filter((adopted) => adopted !== sheet);
		this.sheets.delete(doc);
	}

	update(css: string): void {
		this.css = css;
		for (const sheet of this.sheets.values()) sheet.replaceSync(css);
	}

	remove(): void {
		for (const doc of [...this.sheets.keys()]) this.detach(doc);
	}
}

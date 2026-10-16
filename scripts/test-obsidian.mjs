// Stand-in for the `obsidian` module in unit tests (scripts/test.mjs). Enough for plugin modules to
// load and for pure code to run; anything that needs the app (requests, UI) is not available.
// When a tested module imports something missing here, esbuild names it: add it.

export class Component {}
export class Modal {}
export class Plugin {}
export class PluginSettingTab {}
export class Setting {}
export class ButtonComponent {}
export class DropdownComponent {}
export class TextComponent {}
export class ToggleComponent {}
export class TAbstractFile {}
export class TFile extends TAbstractFile {}
export class TFolder extends TAbstractFile {}
export class Notice {
	constructor(message) {
		this.message = message;
	}
}

export const Keymap = { isModifier: () => false };
export const Platform = { isDesktop: true, isMobile: false };

export function setIcon() {}

export function getLanguage() {
	return 'en';
}

export function normalizePath(path) {
	return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '') || '/';
}

export function getLinkpath(link) {
	return link.split('#')[0] ?? link;
}

export function getFrontMatterInfo() {
	return { exists: false, frontmatter: '', from: 0, to: 0, contentStart: 0 };
}

export async function requestUrl() {
	throw new Error('requestUrl is not available in unit tests');
}

export function debounce(fn) {
	const debounced = (...args) => fn(...args);
	debounced.cancel = () => debounced;
	debounced.run = () => undefined;
	return debounced;
}

/** Only what the plugins use: `moment()` (today) and `moment(text, 'YYYY-MM-DD', true)`. */
export function moment(input) {
	const text = input === undefined ? new Date().toISOString().slice(0, 10) : String(input);
	const date = new Date(`${text}T00:00:00Z`);
	const valid = /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
	return { isValid: () => valid, format: () => text };
}

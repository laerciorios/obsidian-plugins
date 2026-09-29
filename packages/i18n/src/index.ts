import { getLanguage } from 'obsidian';

/** A message catalog: flat keys → text, with optional `{param}` placeholders. */
export type Messages = Record<string, string>;

/** A translation of a catalog: must define every key of the source (English) catalog. */
export type Translation<M extends Messages> = Record<keyof M, string>;

export type Params = Record<string, string | number>;

/** English is the source of truth and the fallback; other locales are keyed by Obsidian language code. */
export type Catalog<M extends Messages> = { en: M } & Record<string, Translation<M>>;

export interface I18n<K extends string> {
	/** Translate a key, filling `{param}` placeholders. */
	t: (key: K, params?: Params) => string;
	/** Locale in use, e.g. "pt-BR" or "en". */
	locale: () => string;
}

export const FALLBACK_LOCALE = 'en';

/** The Obsidian app language ("en" when unavailable). */
export function appLanguage(): string {
	try {
		return typeof getLanguage === 'function' ? getLanguage() || FALLBACK_LOCALE : FALLBACK_LOCALE;
	} catch {
		return FALLBACK_LOCALE;
	}
}

const base = (code: string): string => code.toLowerCase().split(/[-_]/)[0] ?? '';

/**
 * Pick the best available locale for a requested language: exact code
 * (case-insensitive), then same base language ("pt" → "pt-BR"), then English.
 */
export function resolveLocale(requested: string, available: readonly string[]): string {
	const wanted = requested.toLowerCase();
	const exact = available.find((code) => code.toLowerCase() === wanted);
	if (exact) return exact;
	const sameBase = available.find((code) => base(code) === base(wanted));
	return sameBase ?? FALLBACK_LOCALE;
}

/** Replace `{name}` placeholders; unknown placeholders are kept verbatim. */
export function format(template: string, params?: Params): string {
	if (!params) return template;
	return template.replace(/\{(\w+)\}/g, (match, name: string) =>
		name in params ? String(params[name]) : match,
	);
}

/**
 * Create a translator for a plugin. The locale is resolved lazily on the first
 * call (after Obsidian is ready) and cached for the plugin's lifetime.
 */
export function createI18n<M extends Messages>(
	catalog: Catalog<M>,
	language: () => string = appLanguage,
): I18n<keyof M & string> {
	let current: { code: string; messages: Messages } | null = null;

	const resolve = (): { code: string; messages: Messages } => {
		if (!current) {
			const code = resolveLocale(language(), Object.keys(catalog));
			current = { code, messages: catalog[code] ?? catalog.en };
		}
		return current;
	};

	return {
		t: (key, params) => format(resolve().messages[key] ?? catalog.en[key] ?? key, params),
		locale: () => resolve().code,
	};
}

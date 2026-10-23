import { normalizeHex } from '../css/color';
import type { FolderStyle, PresetColor } from '../types';

/**
 * What the "Customize folder" modal is editing. Text, icon, SVG file and hex are kept even while
 * another kind is selected, so switching back and forth loses nothing; only the selected kinds
 * are saved.
 */
export interface Draft {
	symbolKind: 'none' | 'text' | 'lucide' | 'svg';
	text: string;
	icon: string;
	/** Vault path of the SVG file. */
	svg: string;
	/** Draw the SVG in the folder color (a mask) instead of its own colors. */
	tint: boolean;
	color: { kind: 'none' } | { kind: 'preset'; value: PresetColor } | { kind: 'hex' };
	hex: string;
}

export type DraftResult = { ok: true; style: FolderStyle | null } | { ok: false; error: 'hex' };

export function draftFromStyle(style: FolderStyle | undefined): Draft {
	const draft: Draft = { symbolKind: 'none', text: '', icon: '', svg: '', tint: false, color: { kind: 'none' }, hex: '' };
	if (style?.symbol?.kind === 'text') draft.text = style.symbol.value;
	if (style?.symbol?.kind === 'lucide') draft.icon = style.symbol.value;
	if (style?.symbol?.kind === 'svg') {
		draft.svg = style.symbol.value;
		draft.tint = style.symbol.tint === true;
	}
	if (style?.symbol) draft.symbolKind = style.symbol.kind;
	if (style?.color?.kind === 'preset') draft.color = style.color;
	if (style?.color?.kind === 'hex') {
		draft.color = { kind: 'hex' };
		draft.hex = style.color.value;
	}
	return draft;
}

/** The style to save; null when nothing is chosen (the folder loses its customization). */
export function styleFromDraft(draft: Draft): DraftResult {
	const style: FolderStyle = {};
	const text = draft.text.trim();
	if (draft.symbolKind === 'text' && text) style.symbol = { kind: 'text', value: text };
	if (draft.symbolKind === 'lucide' && draft.icon) style.symbol = { kind: 'lucide', value: draft.icon };
	// `tint` is written only when on, so a plain SVG stays `{ kind, value }` in data.json.
	if (draft.symbolKind === 'svg' && draft.svg) style.symbol = draft.tint ? { kind: 'svg', value: draft.svg, tint: true } : { kind: 'svg', value: draft.svg };
	if (draft.color.kind === 'preset') style.color = draft.color;
	if (draft.color.kind === 'hex') {
		const hex = normalizeHex(draft.hex);
		if (!hex) return { ok: false, error: 'hex' };
		style.color = { kind: 'hex', value: hex };
	}
	return { ok: true, style: style.symbol || style.color ? style : null };
}


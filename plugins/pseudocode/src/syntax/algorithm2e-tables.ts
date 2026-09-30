import type { CustomWords, KeywordId, Overrides } from './ast';

/** Tables and block-wide directives of the algorithm2e dialect. */

/** Environments of algorithm2e that hold an algorithm. */
export const ENVIRONMENTS = ['algorithm', 'algorithm*', 'algorithm2e', 'algorithm2e*', 'function', 'function*', 'procedure', 'procedure*'];

/** Built-in inputs and outputs, and the fallback for `\Input`/`\Output` used without `\SetKwInOut`. */
export const IO: Record<string, KeywordId> = {
	KwIn: 'input',
	KwOut: 'output',
	KwData: 'data',
	KwResult: 'result',
	Input: 'input',
	Output: 'output',
};

export const LOOPS: Record<string, 'for' | 'foreach' | 'forall' | 'while'> = {
	For: 'for',
	ForEach: 'foreach',
	ForAll: 'forall',
	While: 'while',
};

/** Style commands of algorithm2e mapped onto text styles. */
export const STYLES: Record<string, string> = {
	KwSty: 'textbf',
	FuncSty: 'textsc',
	ProcNameSty: 'textsc',
	DataSty: 'textsf',
	ArgSty: 'emph',
	ProcArgSty: 'emph',
	CommentSty: 'textit',
};

/** Commands that only change the look in LaTeX and have no effect here. */
export const IGNORED = ['incmargin', 'decmargin', 'IncMargin', 'DecMargin', 'setlength', 'centering', 'NoCaptionOfAlgo', 'RestyleAlgo'];
export const UNSUPPORTED = ['SetKwIF', 'SetKwSwitch', 'SetKwHangingKw', 'Indp', 'Indm', 'Indentp', 'nl', 'lnl'];

export type WordDefinition = { kind: 'keyword' | 'data' | 'function'; text: string };
export type ConstructDefinition = { kind: 'io'; label: string } | { kind: 'prog' | 'block' | 'for' | 'repeat'; words: CustomWords };
export type Definition = WordDefinition | ConstructDefinition;

export function isConstruct(definition: Definition): definition is ConstructDefinition {
	return definition.kind !== 'keyword' && definition.kind !== 'data' && definition.kind !== 'function';
}

/**
 * Style commands that apply to the whole block, over the plugin settings
 * (`\SetAlgoLined`, `\LinesNumbered`...). Returns whether `name` is one.
 */
export function applyDirective(name: string, overrides: Overrides): boolean {
	switch (name) {
		case 'SetAlgoLined':
			Object.assign(overrides, { scopeLines: true, showEnd: true });
			return true;
		case 'SetAlgoVlined':
			Object.assign(overrides, { scopeLines: true, showEnd: false });
			return true;
		case 'SetAlgoNoLine':
			Object.assign(overrides, { scopeLines: false, showEnd: true });
			return true;
		case 'SetAlgoNoEnd':
			overrides.showEnd = false;
			return true;
		case 'SetAlgoShortEnd':
		case 'SetAlgoLongEnd':
			overrides.longEnd = name === 'SetAlgoLongEnd';
			return true;
		case 'LinesNumbered':
		case 'LinesNotNumbered':
		case 'LinesNumberedHidden':
			overrides.lineNumbers = name === 'LinesNumbered' ? 1 : 0;
			return true;
		case 'DontPrintSemicolon':
		case 'PrintSemicolon':
			overrides.semicolons = name === 'PrintSemicolon';
			return true;
		default:
			return false;
	}
}

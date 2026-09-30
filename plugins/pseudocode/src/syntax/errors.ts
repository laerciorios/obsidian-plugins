/** Error codes; the messages live in the i18n catalogs (`error.<code>`). */
export type ErrorCode =
	| 'expected'
	| 'unexpected'
	| 'endOfBlock'
	| 'unknownCommand'
	| 'unknownEnvironment'
	| 'unclosedMath'
	| 'unsupported';

/** A syntax error in a block, with the 1-based line of the block where it happened. */
export class PseudocodeError extends Error {
	constructor(
		readonly code: ErrorCode,
		readonly params: Record<string, string>,
		readonly line: number,
	) {
		super(`${code} at line ${line}: ${JSON.stringify(params)}`);
		this.name = 'PseudocodeError';
	}
}

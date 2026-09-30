import { Algorithm2eParser } from './algorithm2e';
import { AlgorithmicParser } from './algorithmic';
import type { Algorithm, Dialect } from './ast';
import { tokenize } from './lexer';

export type { Algorithm, Dialect, Inline, KeywordId, Node } from './ast';
export { PseudocodeError } from './errors';
export type { ErrorCode } from './errors';

const ALGORITHMIC = /\\begin\s*\{\s*algorithmic\s*\}/;

/** Source without `%` comments (an escaped `\%` stays). */
function withoutComments(source: string): string {
	return source.replace(/(^|[^\\])%.*$/gm, '$1');
}

/**
 * A block with `\begin{algorithmic}` uses the syntax of the community plugin
 * (pseudocode.js); anything else is read as algorithm2e, pasted from LaTeX.
 */
export function detectDialect(source: string): Dialect {
	return ALGORITHMIC.test(withoutComments(source)) ? 'algorithmic' : 'algorithm2e';
}

/** Parse a `pseudo` block. Throws `PseudocodeError` on a syntax error. */
export function parse(source: string): Algorithm[] {
	const tokens = tokenize(source);
	return detectDialect(source) === 'algorithmic'
		? new AlgorithmicParser(tokens, source).document()
		: new Algorithm2eParser(tokens, source).document();
}

import { PseudocodeError } from './errors';

export type TokenType =
	| 'command'
	| 'open'
	| 'close'
	| 'math'
	| 'text'
	/** `\\` */
	| 'newline'
	/** `\;` (the statement end of algorithm2e) */
	| 'semicolon'
	/** `~`, `\ `, `\,` and other explicit spaces */
	| 'space'
	| 'eof';

export interface Token {
	type: TokenType;
	/** Command name without backslash, text, or TeX source of math. */
	value: string;
	/** `\tcp*`: a star right after the command name. */
	star: boolean;
	/** Math between `$$` or `\[`. */
	display: boolean;
	/** Whitespace (or a `%` comment) before the token. */
	space: boolean;
	/** 1-based line where the token starts. */
	line: number;
	/** Offsets in the source, for verbatim copies (labels, definitions). */
	start: number;
	end: number;
}

/** Escaped characters that stand for themselves. */
const ESCAPED: Record<string, string> = {
	'{': '{',
	'}': '}',
	$: '$',
	'&': '&',
	'#': '#',
	'%': '%',
	_: '_',
	'|': '‖',
};

/** Escaped characters that are spacing (`\,`) or nothing at all (`\-`). */
const SPACING = new Set([' ', ',', ':', '!', '>', '\t', '\n']);

const MATH_DELIMITERS = [
	{ open: '$$', close: '$$', display: true },
	{ open: '$', close: '$', display: false },
	{ open: '\\[', close: '\\]', display: true },
	{ open: '\\(', close: '\\)', display: false },
];

function isLetter(char: string | undefined): boolean {
	return char !== undefined && /[A-Za-z]/.test(char);
}

/** Quotes as LaTeX typesets them: `` → “, '' → ”, ` → ‘, ' → ’. */
function latexQuotes(text: string): string {
	return text.replace(/``/g, '“').replace(/''/g, '”').replace(/`/g, '‘').replace(/'/g, '’');
}

function isTextChar(char: string): boolean {
	return !/[\\{}$%~\s]/.test(char);
}

/**
 * Split a block into tokens. Whitespace and `%` comments are skipped and
 * recorded as the `space` flag of the next token, as in LaTeX.
 */
export function tokenize(source: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;
	let line = 1;
	const length = source.length;

	const countLines = (from: number, to: number) => {
		for (let k = from; k < to; k++) if (source[k] === '\n') line++;
	};

	while (true) {
		let space = false;
		while (i < length) {
			const char = source[i]!;
			if (/\s/.test(char)) {
				if (char === '\n') line++;
				space = true;
				i++;
			} else if (char === '%') {
				while (i < length && source[i] !== '\n') i++;
				space = true;
			} else break;
		}
		const start = i;
		const startLine = line;
		const push = (type: TokenType, value: string, end: number, extra: Partial<Token> = {}) => {
			tokens.push({ type, value, star: false, display: false, space, line: startLine, start, end, ...extra });
			countLines(start, end);
			i = end;
		};

		if (i >= length) {
			tokens.push({ type: 'eof', value: '', star: false, display: false, space, line, start: i, end: i });
			return tokens;
		}

		const char = source[i]!;
		const math = MATH_DELIMITERS.find((delimiter) => source.startsWith(delimiter.open, i));
		if (math) {
			let k = i + math.open.length;
			while (k < length) {
				if (source.startsWith(math.close, k) && source[k - 1] !== '\\') break;
				k++;
			}
			if (k >= length) throw new PseudocodeError('unclosedMath', { delimiter: math.close }, startLine);
			push('math', source.slice(i + math.open.length, k), k + math.close.length, { display: math.display });
			continue;
		}

		if (char === '\\') {
			const next = source[i + 1];
			if (isLetter(next)) {
				let k = i + 1;
				while (isLetter(source[k])) k++;
				const name = source.slice(i + 1, k);
				const star = source[k] === '*';
				push('command', name, star ? k + 1 : k, { star });
			} else if (next === '\\') {
				push('newline', '', i + 2);
			} else if (next === ';') {
				push('semicolon', '', i + 2);
			} else if (next !== undefined && next in ESCAPED) {
				push('text', ESCAPED[next]!, i + 2);
			} else if (next !== undefined && SPACING.has(next)) {
				push('space', '', i + 2);
			} else if (next === '-' || next === '/') {
				push('text', '', i + 2);
			} else {
				push('text', next ?? '\\', Math.min(i + 2, length));
			}
			continue;
		}

		if (char === '{') {
			push('open', '{', i + 1);
			continue;
		}
		if (char === '}') {
			push('close', '}', i + 1);
			continue;
		}
		if (char === '~') {
			push('space', '', i + 1);
			continue;
		}
		let k = i;
		while (k < length && isTextChar(source[k]!)) k++;
		push('text', latexQuotes(source.slice(i, k)), k);
	}
}

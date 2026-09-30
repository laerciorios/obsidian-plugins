import type { Inline } from './ast';
import { PseudocodeError } from './errors';
import type { ErrorCode } from './errors';
import type { Token } from './lexer';

/** `\textbf{...}` and friends: style the group that follows. */
export const FONT_COMMANDS = [
	'textnormal',
	'textrm',
	'textsf',
	'texttt',
	'textup',
	'textit',
	'textsl',
	'textsc',
	'textbf',
	'textmd',
	'textlf',
	'emph',
	'underline',
	'uppercase',
	'lowercase',
] as const;

/** `\bfseries ...`, `\small ...`: style the rest of the current group. */
export const DECLARATIONS = [
	'normalfont',
	'rmfamily',
	'sffamily',
	'ttfamily',
	'upshape',
	'itshape',
	'slshape',
	'scshape',
	'bfseries',
	'mdseries',
	'lfseries',
	'tiny',
	'scriptsize',
	'footnotesize',
	'small',
	'normalsize',
	'large',
	'Large',
	'LARGE',
	'huge',
	'Huge',
] as const;

/** Text-mode symbols. */
const SYMBOLS: Record<string, string> = {
	textbackslash: '\\',
	textasciitilde: '~',
	textasciicircum: '^',
	textunderscore: '_',
	textbar: '|',
	textless: '<',
	textgreater: '>',
	ldots: '…',
	dots: '…',
	textellipsis: '…',
	S: '§',
	LaTeX: 'LaTeX',
	TeX: 'TeX',
};

/**
 * Shared machinery of both dialects: token stream, errors, groups and inline text.
 * Each dialect says which commands are inline (`inlineCommand`) and parses the
 * structure itself.
 */
export abstract class Parser {
	protected pos = 0;

	constructor(
		protected readonly tokens: Token[],
		protected readonly source: string,
		/** pseudocode.js accepts `\STATE` for `\State`; algorithm2e (LaTeX) does not. */
		private readonly caseInsensitive: boolean,
	) {}

	protected peek(offset = 0): Token {
		return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)]!;
	}

	protected next(): Token {
		const token = this.peek();
		if (token.type !== 'eof') this.pos++;
		return token;
	}

	protected get atEnd(): boolean {
		return this.peek().type === 'eof';
	}

	/** Canonical spelling of a command name among `names`, or null. */
	protected match(name: string, names: readonly string[]): string | null {
		if (names.includes(name)) return name;
		if (!this.caseInsensitive) return null;
		const lower = name.toLowerCase();
		return names.find((candidate) => candidate.toLowerCase() === lower) ?? null;
	}

	/** Whether the next token is one of these commands. */
	protected at(names: readonly string[]): string | null {
		const token = this.peek();
		return token.type === 'command' ? this.match(token.value, names) : null;
	}

	protected fail(code: ErrorCode, params: Record<string, string> = {}, token: Token = this.peek()): never {
		if (token.type === 'eof' && code !== 'endOfBlock') {
			throw new PseudocodeError('endOfBlock', { expected: params.expected ?? '' }, token.line);
		}
		throw new PseudocodeError(code, params, token.line);
	}

	/** How a token is shown in an error message. */
	protected describe(token: Token): string {
		switch (token.type) {
			case 'command':
				return `\\${token.value}${token.star ? '*' : ''}`;
			case 'open':
				return '{';
			case 'close':
				return '}';
			case 'math':
				return token.display ? `$$${token.value}$$` : `$${token.value}$`;
			case 'newline':
				return '\\\\';
			case 'semicolon':
				return '\\;';
			case 'text':
				return `“${token.value}”`;
			default:
				return '';
		}
	}

	protected expected(what: string): never {
		const token = this.peek();
		return this.fail('expected', { expected: what, found: this.describe(token) }, token);
	}

	protected expectOpen(): void {
		if (this.peek().type !== 'open') this.expected('{');
		this.next();
	}

	protected expectClose(): void {
		if (this.peek().type !== 'close') this.expected('}');
		this.next();
	}

	/** Consume `\name`, or fail saying it was expected. */
	protected expectCommand(name: string): void {
		if (!this.at([name])) this.expected(`\\${this.displayName(name)}`);
		this.next();
	}

	/** How a command is spelled in messages (the algorithmic parser matches lowercase names). */
	protected displayName(name: string): string {
		return name;
	}

	/** Verbatim content of a balanced `{...}` group (names, labels, definitions). */
	protected rawGroup(): string {
		this.expectOpen();
		const from = this.tokens[this.pos - 1]!.end;
		let depth = 1;
		while (true) {
			const token = this.peek();
			if (token.type === 'eof') this.expected('}');
			this.next();
			if (token.type === 'open') depth++;
			else if (token.type === 'close' && --depth === 0) return this.source.slice(from, token.start);
		}
	}

	/** `\begin{name}` → name (consumed). */
	protected beginEnvironment(): string {
		this.expectCommand('begin');
		return this.rawGroup().trim();
	}

	protected endEnvironment(name: string): void {
		if (!this.at(['end'])) this.expected(`\\end{${name}}`);
		const token = this.next();
		const found = this.rawGroup().trim();
		if (found !== name) this.fail('expected', { expected: `\\end{${name}}`, found: `\\end{${found}}` }, token);
	}

	/**
	 * An optional `[...]` argument right after the previous token, verbatim
	 * (`\begin{algorithmic}[1]`, `\begin{algorithm}[H]`, `\tcp*[r]`).
	 */
	protected optional(): string | null {
		const first = this.peek();
		if (first.type !== 'text' || first.space || !first.value.startsWith('[')) return null;
		const from = first.start;
		while (true) {
			const token = this.peek();
			if (token.type === 'eof') this.expected(']');
			this.next();
			const close = token.type === 'text' ? token.value.indexOf(']') : -1;
			if (close >= 0) {
				if (close < token.value.length - 1) {
					// "[1]foo": give the rest back as a text token.
					const rest = token.start + close + 1;
					this.tokens.splice(this.pos, 0, { ...token, value: token.value.slice(close + 1), space: false, start: rest });
				}
				return this.source.slice(from + 1, token.start + close);
			}
		}
	}

	/** `{...}` as inline text. */
	protected group(): Inline[] {
		this.expectOpen();
		const content = this.inline(false);
		this.expectClose();
		return content;
	}

	/**
	 * Inline text up to a closing brace, the end of the block or a command that
	 * is not inline (the caller decides what that command means). With
	 * `statementEnd`, `\;` also ends it (algorithm2e); otherwise `\;` is a space.
	 */
	protected inline(statementEnd: boolean): Inline[] {
		const out: Inline[] = [];
		const add = (token: Token, items: Inline[]) => {
			if (token.space && out.length > 0) out.push({ kind: 'space' });
			for (const item of items) {
				const last = out[out.length - 1];
				if (item.kind === 'text' && last?.kind === 'text') last.text += item.text;
				else out.push(item);
			}
		};
		while (true) {
			const token = this.peek();
			switch (token.type) {
				case 'eof':
				case 'close':
					return out;
				case 'semicolon':
					if (statementEnd) return out;
					this.next();
					add(token, [{ kind: 'space' }]);
					break;
				case 'open': {
					this.next();
					const children = this.inline(false);
					this.expectClose();
					add(token, children);
					break;
				}
				case 'text':
					this.next();
					add(token, token.value ? [{ kind: 'text', text: token.value }] : []);
					break;
				case 'math':
					this.next();
					add(token, [{ kind: 'math', tex: token.value, display: token.display }]);
					break;
				case 'newline':
					this.next();
					add(token, [{ kind: 'break' }]);
					break;
				case 'space':
					this.next();
					add(token, [{ kind: 'space' }]);
					break;
				case 'command': {
					const items = this.textCommand(token, statementEnd) ?? this.inlineCommand(token, statementEnd);
					if (!items) return out;
					add(token, items);
					break;
				}
			}
		}
	}

	/** Font, size and symbol commands, common to both dialects. Consumes them. */
	private textCommand(token: Token, statementEnd: boolean): Inline[] | null {
		const name = token.value;
		const symbol = SYMBOLS[name];
		if (symbol !== undefined) {
			this.next();
			return [{ kind: 'text', text: symbol }];
		}
		const font = this.match(name, FONT_COMMANDS);
		if (font) {
			this.next();
			const children = this.peek().type === 'open' ? this.group() : [];
			return [{ kind: 'styled', command: font, declaration: false, children }];
		}
		// Sizes differ only by case (\large, \Large, \LARGE): match them exactly first.
		const declaration = (DECLARATIONS as readonly string[]).includes(name) ? name : this.match(name, DECLARATIONS);
		if (declaration) {
			this.next();
			return [{ kind: 'styled', command: declaration, declaration: true, children: this.inline(statementEnd) }];
		}
		return null;
	}

	/** Dialect-specific inline commands (consumed), or null when the command ends the text. */
	protected abstract inlineCommand(token: Token, statementEnd: boolean): Inline[] | null;
}

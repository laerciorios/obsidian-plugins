import type { Algorithm, Branch, Inline, KeywordId, Node } from './ast';
import type { Token } from './lexer';
import { Parser } from './parser';

/** Words that pseudocode.js typesets as keywords inside text (`\AND`, `\TRUE`...). */
const TEXT_KEYWORDS = ['and', 'or', 'not', 'true', 'false', 'to', 'downto'] as const;
const IO = ['require', 'ensure', 'input', 'output'] as const;
const IF_ENDS = ['elsif', 'elseif', 'elif', 'else', 'endif'];
const LOOPS: Record<string, { loop: 'for' | 'forall' | 'foreach' | 'while' | 'loop' | 'upon'; end: string }> = {
	for: { loop: 'for', end: 'endfor' },
	forall: { loop: 'forall', end: 'endfor' },
	foreach: { loop: 'foreach', end: 'endfor' },
	while: { loop: 'while', end: 'endwhile' },
	loop: { loop: 'loop', end: 'endloop' },
	upon: { loop: 'upon', end: 'endupon' },
};

/** Commands that close a block: a wrong one ends the block, so the error names the one expected. */
const CLOSERS = ['endif', 'endfor', 'endwhile', 'endloop', 'endupon', 'endprocedure', 'endfunction', 'until', ...IF_ENDS];

/** Commands that shape the algorithm; anything else in a block must be inline text. */
const STRUCTURE = [
	'state',
	'statex',
	'return',
	'print',
	...IO,
	'if',
	...IF_ENDS,
	...Object.keys(LOOPS),
	'endfor',
	'endwhile',
	'endloop',
	'endupon',
	'repeat',
	'until',
	'procedure',
	'endprocedure',
	'function',
	'endfunction',
	'break',
	'continue',
	'comment',
	'begin',
	'end',
	'caption',
	'label',
];

/**
 * The syntax of the community Pseudocode plugin (pseudocode.js, close to
 * algorithmicx): `\State`, `\If{...}` ... `\EndIf`. Commands are case-insensitive.
 */
export class AlgorithmicParser extends Parser {
	constructor(tokens: Token[], source: string) {
		super(tokens, source, true);
	}

	protected displayName(name: string): string {
		const spelled: Record<string, string> = {
			endif: 'EndIf',
			endfor: 'EndFor',
			endwhile: 'EndWhile',
			endloop: 'EndLoop',
			endupon: 'EndUpon',
			endprocedure: 'EndProcedure',
			endfunction: 'EndFunction',
			until: 'Until',
		};
		return spelled[name] ?? name;
	}

	document(): Algorithm[] {
		const algorithms: Algorithm[] = [];
		while (!this.atEnd) {
			if (!this.at(['begin'])) this.fail('unexpected', { found: this.describe(this.peek()) });
			const token = this.peek();
			const name = this.beginEnvironment();
			if (name === 'algorithm' || name === 'algorithm*') algorithms.push(this.algorithm(name));
			else if (name === 'algorithmic') {
				const algorithm = this.empty(false);
				this.algorithmic(algorithm);
				algorithms.push(algorithm);
			} else this.fail('unknownEnvironment', { name }, token);
		}
		return algorithms;
	}

	private empty(float: boolean): Algorithm {
		return { dialect: 'algorithmic', float, caption: null, label: null, body: [], overrides: {}, definitions: [] };
	}

	private algorithm(environment: string): Algorithm {
		const algorithm = this.empty(true);
		this.optional(); // placement: [H], [htbp]
		while (true) {
			const command = this.at(['caption', 'label', 'begin', 'end']);
			if (command === 'end') break;
			if (command === 'caption') {
				this.next();
				this.optional(); // short caption for the list of algorithms
				algorithm.caption = this.group();
			} else if (command === 'label') {
				this.next();
				algorithm.label = this.rawGroup().trim();
			} else if (command === 'begin') {
				const token = this.peek();
				const name = this.beginEnvironment();
				if (name !== 'algorithmic') this.fail('unknownEnvironment', { name }, token);
				this.algorithmic(algorithm);
			} else if (this.atEnd) {
				this.expected(`\\end{${environment}}`);
			} else {
				this.fail('unexpected', { found: this.describe(this.peek()) });
			}
		}
		this.endEnvironment(environment);
		return algorithm;
	}

	/** Body of `\begin{algorithmic}[n]`, appended to the algorithm. */
	private algorithmic(algorithm: Algorithm): void {
		const option = this.optional();
		if (option !== null && /^\s*\d+\s*$/.test(option)) algorithm.overrides.lineNumbers = Number(option);
		algorithm.body.push(...this.block([]));
		this.endEnvironment('algorithmic');
	}

	/** Nodes up to one of `ends` (not consumed) or `\end`. */
	private block(ends: readonly string[]): Node[] {
		const nodes: Node[] = [];
		while (!this.atEnd) {
			const token = this.peek();
			if (token.type === 'close') this.fail('unexpected', { found: '}' });
			if (token.type === 'command') {
				const name = this.match(token.value, STRUCTURE);
				if (name === 'end' || (name && (ends.includes(name) || CLOSERS.includes(name)))) return nodes;
				if (name) {
					nodes.push(this.structure(name, token));
					continue;
				}
			}
			// Inline content without \State (lenient: pseudocode.js rejects it).
			const text = this.inline(false);
			if (text.length === 0) this.fail('unknownCommand', { name: this.describe(this.peek()) });
			nodes.push({ type: 'statement', text, numbered: true, semicolon: false });
		}
		return nodes;
	}

	private structure(name: string, token: Token): Node {
		switch (name) {
			case 'state':
			case 'statex': {
				this.next();
				// `\State \Return x` is one line, as in algorithmicx.
				const keyword = this.at(['return', 'print']);
				if (keyword && name === 'state') return this.structure(keyword, this.peek());
				return { type: 'statement', text: this.inline(false), numbered: name === 'state', semicolon: false };
			}
			case 'return':
			case 'print':
				this.next();
				return { type: name, text: this.inline(false) };
			case 'require':
			case 'ensure':
			case 'input':
			case 'output':
				this.next();
				return { type: 'io', label: [{ kind: 'keyword', keyword: name }], text: this.inline(false) };
			case 'if':
				return this.conditional();
			case 'repeat': {
				this.next();
				const body = this.block(['until']);
				this.expectCommand('until');
				return { type: 'repeat', body, until: this.group(), oneLine: false };
			}
			case 'procedure':
			case 'function': {
				this.next();
				const title = this.group();
				const args = this.group();
				const end = `end${name}`;
				const body = this.block([end]);
				this.expectCommand(end);
				return { type: 'procedure', kind: name, name: title, args, body };
			}
			case 'break':
			case 'continue':
				this.next();
				return { type: 'command', command: name };
			case 'comment':
				this.next();
				return { type: 'comment', text: this.group(), side: true, style: 'line' };
			default: {
				const loop = LOOPS[name];
				if (loop) return this.loop(loop);
				return this.fail('unexpected', { found: this.describe(token) }, token);
			}
		}
	}

	private conditional(): Node {
		this.next();
		const branches: Branch[] = [{ cond: this.group(), body: this.block(IF_ENDS), oneLine: false }];
		while (this.at(['elsif', 'elseif', 'elif'])) {
			this.next();
			branches.push({ cond: this.group(), body: this.block(IF_ENDS), oneLine: false });
		}
		let otherwise: Branch | null = null;
		if (this.at(['else'])) {
			this.next();
			otherwise = { cond: [], body: this.block(['endif']), oneLine: false };
		}
		this.expectCommand('endif');
		return { type: 'if', branches, otherwise, end: true, oneLine: false };
	}

	private loop(loop: (typeof LOOPS)[string]): Node {
		this.next();
		const cond = loop.loop === 'loop' ? [] : this.group();
		const body = this.block([loop.end]);
		this.expectCommand(loop.end);
		return { type: 'loop', loop: loop.loop, cond, body, oneLine: false };
	}

	protected inlineCommand(token: Token): Inline[] | null {
		if (this.match(token.value, ['call'])) {
			this.next();
			const name = this.group();
			return [{ kind: 'call', name, args: this.group() }];
		}
		const keyword = this.match(token.value, TEXT_KEYWORDS);
		if (keyword) {
			this.next();
			return [{ kind: 'keyword', keyword: keyword as KeywordId }];
		}
		return null;
	}
}

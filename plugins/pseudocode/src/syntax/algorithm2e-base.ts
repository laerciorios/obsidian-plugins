import { STYLES } from './algorithm2e-tables';
import type { ConstructDefinition, Definition } from './algorithm2e-tables';
import type { Algorithm, CustomWords, Inline, Node } from './ast';
import type { Token } from './lexer';
import { Parser } from './parser';

/**
 * State and building blocks of the algorithm2e parser: the words and constructs
 * the block defines (`\SetKw...`), statements, comments and inline commands.
 * The grammar itself is in algorithm2e.ts.
 */
export abstract class Algorithm2eBase extends Parser {
	protected readonly definitions = new Map<string, Definition>();
	protected algorithm!: Algorithm;
	/** `\nonl`: the next line has no number. */
	protected skipNumber = false;

	constructor(tokens: Token[], source: string) {
		super(tokens, source, false);
	}

	/** Nodes up to `}` (inside a body), `\end` or the end of the block; none of them consumed. */
	protected abstract body(inGroup: boolean): Node[];

	protected empty(float: boolean): Algorithm {
		return { dialect: 'algorithm2e', float, caption: null, label: null, body: [], overrides: {}, definitions: [] };
	}

	/** Text up to `\;`, a structural command or the end of the body. */
	protected statement(nodes: Node[]): void {
		const text = this.inline(true);
		const semicolon = this.peek().type === 'semicolon';
		if (semicolon) this.next();
		if (text.length === 0 && !semicolon) {
			const token = this.peek();
			if (token.type === 'command') this.fail('unknownCommand', { name: this.describe(token) });
			return;
		}
		nodes.push({ type: 'statement', text, numbered: !this.skipNumber, semicolon });
		this.skipNumber = false;
	}

	/** `{...}` holding statements. */
	protected bodyGroup(): Node[] {
		this.expectOpen();
		const nodes = this.body(true);
		this.expectClose();
		return nodes;
	}

	/** Groups of a definition, verbatim, and the definition itself kept for the export. */
	protected define(token: Token, count: number): string[] {
		this.next();
		const args: string[] = [];
		for (let i = 0; i < count; i++) args.push(this.rawGroup().trim());
		const end = this.tokens[this.pos - 1]!.end;
		this.algorithm.definitions.push(this.source.slice(token.start, end));
		return args;
	}

	protected words(args: string[]): CustomWords {
		return { command: args[0] ?? '', head: args[1] ?? '', middle: args[2] ?? '', end: args[3] ?? '' };
	}

	/** Skip a command that only matters in LaTeX, with its arguments. */
	protected skip(): void {
		this.next();
		while (true) {
			if (this.optional() !== null) continue;
			const token = this.peek();
			if (token.type !== 'open' || token.space) return;
			this.rawGroup();
		}
	}

	protected customConstruct(name: string, definition: ConstructDefinition): Node {
		switch (definition.kind) {
			case 'io':
				return { type: 'io', label: [{ kind: 'word', text: definition.label, style: 'keyword' }], text: this.group(), command: name };
			case 'prog': {
				const header = this.group();
				return { type: 'procedure', kind: 'custom', name: [], args: header, body: this.bodyGroup(), custom: definition.words };
			}
			case 'for': {
				const cond = this.group();
				return { type: 'loop', loop: 'custom', cond, body: this.bodyGroup(), oneLine: false, custom: definition.words };
			}
			case 'repeat': {
				const until = this.group();
				return { type: 'repeat', until, body: this.bodyGroup(), oneLine: false, custom: definition.words };
			}
			case 'block':
				return { type: 'block', body: this.bodyGroup(), custom: definition.words };
		}
	}

	/** `\tcp{...}` on a line of its own; `\tcp*[r]{...}` at the right of the current line. */
	protected comment(token: Token, nodes: Node[]): void {
		this.next();
		if (token.star) this.optional();
		const text = this.group();
		const style = token.value === 'tcc' ? 'block' : 'line';
		if (token.star) {
			// A side comment ends the statement before it, and algorithm2e prints its `;`.
			const last = nodes[nodes.length - 1];
			if (last?.type === 'statement' && last.text.length > 0) last.semicolon = true;
		}
		nodes.push({ type: 'comment', text, side: token.star, style });
	}

	/** The one-line body of `\lIf`, `\lFor`...: statements, possibly without `\;`. */
	protected lineBody(): Node[] {
		return this.bodyGroup();
	}

	protected inlineCommand(token: Token): Inline[] | null {
		const name = token.value;
		const custom = this.definitions.get(name);
		if (custom?.kind === 'keyword' || custom?.kind === 'data') {
			this.next();
			return [{ kind: 'word', text: custom.text, style: custom.kind, command: name }];
		}
		if (custom?.kind === 'function') {
			this.next();
			const args = this.peek().type === 'open' && !this.peek().space ? this.group() : [];
			return [{ kind: 'call', name: [{ kind: 'text', text: custom.text }], args, command: name }];
		}
		if (name === 'KwTo') {
			this.next();
			return [{ kind: 'keyword', keyword: 'to' }];
		}
		if (name === 'KwRet' || name === 'Return') {
			this.next();
			return [{ kind: 'keyword', keyword: 'return' }];
		}
		if (name === 'Call') {
			this.next();
			const title = this.group();
			return [{ kind: 'call', name: title, args: this.group() }];
		}
		const style = STYLES[name];
		if (style) {
			this.next();
			return [{ kind: 'styled', command: style, declaration: false, children: this.group() }];
		}
		return null;
	}
}

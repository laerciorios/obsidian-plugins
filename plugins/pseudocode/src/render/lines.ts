import type { Algorithm, Inline, KeywordId, Node } from '../syntax';
import type { CustomWords } from '../syntax/ast';
import type { KeywordTable } from './keywords';

/** Plugin settings that shape the rendering; a block can override some of them. */
export interface BaseStyle {
	lineNumbers: boolean;
	scopeLines: boolean;
	showEnd: boolean;
	commentDelimiter: string;
	keywords: KeywordTable;
}

export interface RenderStyle {
	/** 0: no numbers; n: number every n-th line. */
	lineNumbers: number;
	scopeLines: boolean;
	showEnd: boolean;
	longEnd: boolean;
	semicolons: boolean;
	commentDelimiter: string;
	keywords: KeywordTable;
}

export interface Line {
	/** `io`: Require/Input lines, unnumbered with a hanging indent. `comment`: a comment on its own line. */
	kind: 'code' | 'io' | 'comment' | 'blank';
	/** 0 for the top level of the algorithm. */
	depth: number;
	number: number | null;
	/** Keywords already resolved to words of the chosen language. */
	content: Inline[];
	/** Side comment, right-aligned, delimiter included. */
	comment: Inline[] | null;
}

export interface Layout {
	float: boolean;
	caption: Inline[] | null;
	lines: Line[];
	style: RenderStyle;
}

/** Settings merged with what the block says (`[1]`, `\SetAlgoLined`...) and the dialect defaults. */
export function resolveStyle(algorithm: Algorithm, base: BaseStyle): RenderStyle {
	const overrides = algorithm.overrides;
	return {
		lineNumbers: overrides.lineNumbers ?? (base.lineNumbers ? 1 : 0),
		scopeLines: overrides.scopeLines ?? base.scopeLines,
		showEnd: overrides.showEnd ?? base.showEnd,
		// algorithmic prints "end if"; algorithm2e prints "end".
		longEnd: overrides.longEnd ?? algorithm.dialect === 'algorithmic',
		semicolons: overrides.semicolons ?? algorithm.dialect === 'algorithm2e',
		commentDelimiter: base.commentDelimiter,
		keywords: base.keywords,
	};
}

const SPACE: Inline = { kind: 'space' };

/** Parts joined by single spaces, skipping empty ones. */
function join(...parts: Inline[][]): Inline[] {
	const out: Inline[] = [];
	for (const part of parts) {
		if (part.length === 0) continue;
		if (out.length > 0) out.push(SPACE);
		out.push(...part);
	}
	return out;
}

/** Plain text of inline content (labels). */
export function plainText(content: Inline[], keywords: KeywordTable): string {
	return content
		.map((item) => {
			switch (item.kind) {
				case 'text':
				case 'word':
					return item.text;
				case 'space':
					return ' ';
				case 'keyword':
					return keywords[item.keyword];
				case 'math':
					return item.tex;
				case 'styled':
					return plainText(item.children, keywords);
				case 'call':
					return `${plainText(item.name, keywords)}(${plainText(item.args, keywords)})`;
				case 'break':
					return ' ';
			}
		})
		.join('');
}

class Builder {
	readonly lines: Line[] = [];
	private count = 0;
	private pending: Inline[][] = [];

	constructor(private readonly style: RenderStyle) {}

	kw(keyword: KeywordId): Inline[] {
		return [{ kind: 'word', text: this.style.keywords[keyword], style: 'keyword' }];
	}

	word(text: string): Inline[] {
		return text ? [{ kind: 'word', text, style: 'keyword' }] : [];
	}

	/** Keywords → words of the chosen language, deep. */
	resolve(content: Inline[]): Inline[] {
		return content.map((item): Inline => {
			switch (item.kind) {
				case 'keyword':
					return { kind: 'word', text: this.style.keywords[item.keyword], style: 'keyword' };
				case 'styled':
					return { ...item, children: this.resolve(item.children) };
				case 'call':
					return { ...item, name: this.resolve(item.name), args: this.resolve(item.args) };
				default:
					return item;
			}
		});
	}

	commentText(text: Inline[], style: 'line' | 'block'): Inline[] {
		const body = this.resolve(text);
		if (style === 'block') return join([{ kind: 'text', text: '/*' }], body, [{ kind: 'text', text: '*/' }]);
		return join(this.style.commentDelimiter ? [{ kind: 'text', text: this.style.commentDelimiter }] : [], body);
	}

	push(kind: Line['kind'], depth: number, content: Inline[], numbered = kind === 'code' || kind === 'comment'): Line {
		let number: number | null = null;
		if (numbered) {
			this.count++;
			const every = this.style.lineNumbers;
			if (every > 0 && this.count % every === 0) number = this.count;
		}
		const line: Line = { kind, depth, number, content, comment: null };
		for (const comment of this.pending) this.attach(line, comment);
		this.pending = [];
		this.lines.push(line);
		return line;
	}

	private attach(line: Line, comment: Inline[]): void {
		line.comment = line.comment ? join(line.comment, comment) : comment;
	}

	/** Right-aligned on the last line, as pseudocode.js does; before any line, on the next one. */
	side(comment: Inline[]): void {
		const last = this.lines[this.lines.length - 1];
		if (last) this.attach(last, comment);
		else this.pending.push(comment);
	}

	end(keyword: KeywordId, depth: number, custom?: CustomWords): void {
		if (!this.style.showEnd) return;
		if (custom) {
			if (custom.end) this.push('code', depth, this.word(custom.end));
			return;
		}
		this.push('code', depth, this.kw(this.style.longEnd ? keyword : 'end'));
	}

	statementText(node: Extract<Node, { type: 'statement' }>): Inline[] {
		const text = this.resolve(node.text);
		return node.semicolon && this.style.semicolons ? [...text, { kind: 'text', text: ';' }] : text;
	}

	/** A one-line body (`\lIf{c}{x\;}`), or null when it holds more than simple statements. */
	inlineBody(nodes: Node[]): { content: Inline[]; comments: Inline[][] } | null {
		const parts: Inline[][] = [];
		const comments: Inline[][] = [];
		for (const node of nodes) {
			if (node.type === 'statement') parts.push(this.statementText(node));
			else if (node.type === 'return' || node.type === 'print') parts.push(join(this.kw(node.type), this.resolve(node.text)));
			else if (node.type === 'command') parts.push(this.kw(node.command));
			else if (node.type === 'comment' && node.side) comments.push(this.commentText(node.text, node.style));
			else return null;
		}
		return { content: join(...parts), comments };
	}

	/** Header line followed by its body, on one line when asked and possible. */
	part(head: Inline[], body: Node[], depth: number, oneLine: boolean): void {
		const single = oneLine ? this.inlineBody(body) : null;
		if (single) {
			const line = this.push('code', depth, join(head, single.content));
			for (const comment of single.comments) this.attach(line, comment);
			return;
		}
		this.push('code', depth, head);
		this.nodes(body, depth + 1);
	}

	nodes(nodes: Node[], depth: number): void {
		for (const node of nodes) this.node(node, depth);
	}

	private node(node: Node, depth: number): void {
		switch (node.type) {
			case 'statement':
				this.push('code', depth, this.statementText(node), node.numbered);
				return;
			case 'return':
			case 'print':
				this.push('code', depth, join(this.kw(node.type), this.resolve(node.text)));
				return;
			case 'command':
				this.push('code', depth, this.kw(node.command));
				return;
			case 'io': {
				const label = `${plainText(node.label, this.style.keywords)}:`;
				this.push('io', depth, join(this.word(label), this.resolve(node.text)), false);
				return;
			}
			case 'if':
				return this.conditional(node, depth);
			case 'loop': {
				const cond = this.resolve(node.cond);
				let head: Inline[];
				if (node.custom) head = join(this.word(node.custom.head), cond, this.word(node.custom.middle));
				else if (node.loop === 'loop') head = this.kw('loop');
				else if (node.loop === 'upon') head = join(this.kw('upon'), cond);
				else head = join(this.kw(node.loop === 'custom' ? 'for' : node.loop), cond, this.kw('do'));
				this.part(head, node.body, depth, node.oneLine);
				if (node.oneLine && this.inlineBody(node.body)) return;
				const end: KeywordId = node.loop === 'while' ? 'endwhile' : node.loop === 'loop' ? 'endloop' : node.loop === 'upon' ? 'endupon' : 'endfor';
				this.end(end, depth, node.custom);
				return;
			}
			case 'repeat': {
				const head = node.custom ? this.word(node.custom.head) : this.kw('repeat');
				const until = join(node.custom ? this.word(node.custom.end) : this.kw('until'), this.resolve(node.until));
				const single = node.oneLine ? this.inlineBody(node.body) : null;
				if (single) {
					this.push('code', depth, join(head, single.content, until));
					return;
				}
				this.push('code', depth, head);
				this.nodes(node.body, depth + 1);
				this.push('code', depth, until);
				return;
			}
			case 'procedure': {
				if (node.custom) {
					const header = this.resolve(node.args);
					const middle: Inline[] = node.custom.middle ? [{ kind: 'text', text: node.custom.middle }] : [];
					this.push('code', depth, join(this.word(node.custom.head), [...header, ...middle]));
				} else {
					const call: Inline = { kind: 'call', name: this.resolve(node.name), args: this.resolve(node.args) };
					this.push('code', depth, join(this.kw(node.kind === 'function' ? 'function' : 'procedure'), [call]));
				}
				this.nodes(node.body, depth + 1);
				this.end(node.kind === 'function' ? 'endfunction' : 'endprocedure', depth, node.custom);
				return;
			}
			case 'switch':
				this.push('code', depth, join(this.kw('switch'), this.resolve(node.cond), this.kw('do')));
				this.nodes(node.body, depth + 1);
				this.end('end', depth);
				return;
			case 'case': {
				const head = node.cond ? join(this.kw('case'), this.resolve(node.cond), this.kw('do')) : join(this.kw('otherwise'), this.kw('do'));
				this.part(head, node.body, depth, node.oneLine);
				if (node.end && !(node.oneLine && this.inlineBody(node.body))) this.end('end', depth);
				return;
			}
			case 'block':
				this.push('code', depth, node.custom ? this.word(node.custom.head) : this.kw('begin'));
				this.nodes(node.body, depth + 1);
				this.end('end', depth, node.custom);
				return;
			case 'comment':
				if (node.side) this.side(this.commentText(node.text, node.style));
				else this.push('comment', depth, this.commentText(node.text, node.style));
				return;
			case 'blank':
				this.push('blank', depth, [], false);
				return;
		}
	}

	private conditional(node: Extract<Node, { type: 'if' }>, depth: number): void {
		const [first, ...rest] = node.branches;
		if (!first) return;
		const head = (keyword: KeywordId, cond: Inline[]) => join(this.kw(keyword), this.resolve(cond), this.kw('then'));
		if (node.oneLine && node.otherwise) {
			const then = this.inlineBody(first.body);
			const otherwise = this.inlineBody(node.otherwise.body);
			if (then && otherwise) {
				this.push('code', depth, join(head('if', first.cond), then.content, this.kw('else'), otherwise.content));
				return;
			}
		}
		this.part(head('if', first.cond), first.body, depth, first.oneLine);
		for (const branch of rest) this.part(head('elseif', branch.cond), branch.body, depth, branch.oneLine);
		if (node.otherwise) this.part(this.kw('else'), node.otherwise.body, depth, node.otherwise.oneLine);
		if (node.end) this.end('endif', depth);
	}
}

/** Lines of an algorithm, ready to draw. `number` is its position in the note (captioned algorithms only). */
export function layout(algorithm: Algorithm, base: BaseStyle, number: number | null): Layout {
	const style = resolveStyle(algorithm, base);
	const builder = new Builder(style);
	builder.nodes(algorithm.body, 0);
	let caption: Inline[] | null = null;
	if (algorithm.caption) {
		const title = `${style.keywords.algorithm}${number === null ? '' : ` ${number}`}${algorithm.dialect === 'algorithm2e' ? ':' : ''}`;
		caption = join(builder.word(title), builder.resolve(algorithm.caption));
	}
	return { float: algorithm.float, caption, lines: builder.lines, style };
}

import { Algorithm2eBase } from './algorithm2e-base';
import { ENVIRONMENTS, IGNORED, IO, LOOPS, UNSUPPORTED, applyDirective, isConstruct } from './algorithm2e-tables';
import type { Algorithm, Branch, Node } from './ast';
import type { Token } from './lexer';

/**
 * The algorithm2e package, as written for LaTeX: statements end with `\;`,
 * bodies go between braces (`\If{cond}{...}`). Commands are case-sensitive.
 */
export class Algorithm2eParser extends Algorithm2eBase {
	document(): Algorithm[] {
		const algorithms: Algorithm[] = [];
		if (!this.at(['begin'])) {
			this.algorithm = this.empty(false);
			this.algorithm.body = this.body(false);
			if (!this.atEnd) this.fail('unexpected', { found: this.describe(this.peek()) });
			return this.algorithm.body.length > 0 || this.algorithm.caption ? [this.algorithm] : [];
		}
		while (!this.atEnd) {
			const token = this.peek();
			if (!this.at(['begin'])) this.fail('unexpected', { found: this.describe(token) });
			const name = this.beginEnvironment();
			if (!ENVIRONMENTS.includes(name)) this.fail('unknownEnvironment', { name }, token);
			this.optional(); // placement: [H], [htbp]
			this.algorithm = this.empty(true);
			this.algorithm.body = this.body(false);
			if (this.atEnd) this.expected(`\\end{${name}}`);
			this.endEnvironment(name);
			algorithms.push(this.algorithm);
		}
		return algorithms;
	}

	/** Nodes up to `}` (inside a body), `\end` or the end of the block; none of them consumed. */
	protected body(inGroup: boolean): Node[] {
		const nodes: Node[] = [];
		while (!this.atEnd) {
			const token = this.peek();
			if (token.type === 'close') {
				if (inGroup) return nodes;
				this.fail('unexpected', { found: '}' });
			}
			if (token.type === 'command') {
				if (token.value === 'end') return nodes;
				if (this.structure(token, nodes)) continue;
			}
			this.statement(nodes);
		}
		return nodes;
	}

	/** Handle a structural command; false when it is not one (inline text or unknown). */
	private structure(token: Token, nodes: Node[]): boolean {
		const name = token.value;
		const overrides = this.algorithm.overrides;
		if (applyDirective(name, overrides)) {
			this.next();
			return true;
		}
		const custom = this.definitions.get(name);
		if (custom && isConstruct(custom)) {
			this.next();
			nodes.push(this.customConstruct(name, custom));
			return true;
		}
		switch (name) {
			case 'begin':
				return this.fail('unknownEnvironment', { name: this.beginEnvironment() }, token);
			case 'caption':
				this.next();
				this.optional();
				this.algorithm.caption = this.group();
				return true;
			case 'label':
				this.next();
				this.algorithm.label = this.rawGroup().trim();
				return true;
			case 'nonl':
				this.next();
				this.skipNumber = true;
				return true;
			case 'SetKwInOut':
			case 'SetKwInput': {
				const [command = '', label = ''] = this.define(token, 2);
				this.definitions.set(command, { kind: 'io', label });
				return true;
			}
			case 'SetKw':
			case 'SetKwData':
			case 'SetKwFunction': {
				const [command = '', text = ''] = this.define(token, 2);
				const kind = name === 'SetKw' ? 'keyword' : name === 'SetKwData' ? 'data' : 'function';
				this.definitions.set(command, { kind, text });
				return true;
			}
			case 'SetKwProg':
			case 'SetKwFor': {
				const args = this.define(token, 4);
				this.definitions.set(args[0] ?? '', { kind: name === 'SetKwProg' ? 'prog' : 'for', words: this.words(args) });
				return true;
			}
			case 'SetKwBlock':
			case 'SetKwRepeat': {
				const [command = '', head = '', end = ''] = this.define(token, 3);
				const kind = name === 'SetKwBlock' ? 'block' : 'repeat';
				this.definitions.set(command, { kind, words: { command, head, middle: '', end } });
				return true;
			}
			case 'BlankLine':
				this.next();
				nodes.push({ type: 'blank' });
				return true;
			case 'tcp':
			case 'tcc':
				this.comment(token, nodes);
				return true;
			case 'If':
			case 'uIf':
			case 'eIf':
			case 'lIf':
			case 'leIf':
				nodes.push(this.conditional(name));
				return true;
			case 'Repeat':
			case 'lRepeat': {
				this.next();
				const until = this.group();
				const oneLine = name === 'lRepeat';
				nodes.push({ type: 'repeat', until, body: this.bodyGroup(), oneLine });
				return true;
			}
			case 'Switch':
				this.next();
				nodes.push({ type: 'switch', cond: this.group(), body: this.bodyGroup() });
				return true;
			case 'Case':
			case 'uCase':
			case 'lCase':
				this.next();
				nodes.push({ type: 'case', cond: this.group(), body: this.bodyGroup(), end: name === 'Case', oneLine: name === 'lCase' });
				return true;
			case 'Other':
			case 'uOther':
			case 'lOther':
				this.next();
				nodes.push({ type: 'case', cond: null, body: this.bodyGroup(), end: name === 'Other', oneLine: name === 'lOther' });
				return true;
			case 'Begin':
				this.next();
				nodes.push({ type: 'block', body: this.bodyGroup() });
				return true;
			case 'ElseIf':
			case 'uElseIf':
			case 'lElseIf':
			case 'Else':
			case 'uElse':
			case 'lElse':
				return this.fail('unexpected', { found: this.describe(token) });
		}
		const io = IO[name];
		if (io) {
			this.next();
			nodes.push({ type: 'io', label: [{ kind: 'keyword', keyword: io }], text: this.group(), command: name });
			return true;
		}
		const loop = LOOPS[name] ?? LOOPS[name.slice(1)];
		if (loop && (name in LOOPS || name.startsWith('l'))) {
			this.next();
			const cond = this.group();
			const oneLine = !(name in LOOPS);
			nodes.push({ type: 'loop', loop, cond, body: this.bodyGroup(), oneLine });
			return true;
		}
		if (UNSUPPORTED.includes(name)) this.fail('unsupported', { name: this.describe(token) });
		if (/^(Set|Reset|Restyle)[A-Z]/.test(name) || IGNORED.includes(name)) {
			this.skip();
			return true;
		}
		return false;
	}

	private conditional(first: string): Node {
		this.next();
		const cond = this.group();
		if (first === 'eIf') {
			const then = this.bodyGroup();
			return { type: 'if', branches: [{ cond, body: then, oneLine: false }], otherwise: { cond: [], body: this.bodyGroup(), oneLine: false }, end: true, oneLine: false };
		}
		if (first === 'leIf') {
			const then = this.lineBody();
			const otherwise: Branch = { cond: [], body: this.lineBody(), oneLine: true };
			return { type: 'if', branches: [{ cond, body: then, oneLine: true }], otherwise, end: false, oneLine: true };
		}
		const oneLine = first === 'lIf';
		const branches: Branch[] = [{ cond, body: oneLine ? this.lineBody() : this.bodyGroup(), oneLine }];
		let otherwise: Branch | null = null;
		// \If prints its own "end"; \uIf and \lIf leave it to the last part of the chain.
		let end = first === 'If';
		while (true) {
			const part = this.at(['uElseIf', 'lElseIf', 'ElseIf', 'Else', 'uElse', 'lElse']);
			if (!part) break;
			this.next();
			if (part.endsWith('ElseIf')) {
				const partCond = this.group();
				const line = part === 'lElseIf';
				branches.push({ cond: partCond, body: line ? this.lineBody() : this.bodyGroup(), oneLine: line });
				end = part === 'ElseIf';
				if (end) break;
			} else {
				const line = part === 'lElse';
				otherwise = { cond: [], body: line ? this.lineBody() : this.bodyGroup(), oneLine: line };
				end = part === 'Else';
				break;
			}
		}
		return { type: 'if', branches, otherwise, end, oneLine: false };
	}

}

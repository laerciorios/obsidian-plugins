import type { Algorithm, Inline, KeywordId, Node } from '../syntax';
import type { Branch } from '../syntax/ast';

/** What the export needs from the settings. */
export interface ExportOptions {
	/** A compilable document with the algorithm2e preamble, instead of only the environments. */
	document: boolean;
	lineNumbers: boolean;
	scopeLines: boolean;
	showEnd: boolean;
	/** Keywords in Portuguese: `portuguese` option of algorithm2e. */
	portuguese: boolean;
}

const TEXT_ESCAPES: Record<string, string> = {
	'\\': '\\textbackslash{}',
	'{': '\\{',
	'}': '\\}',
	$: '\\$',
	'&': '\\&',
	'#': '\\#',
	'%': '\\%',
	_: '\\_',
	'^': '\\textasciicircum{}',
	'~': '\\textasciitilde{}',
};

/** Keywords inside text; the others only appear in the structure. */
const KEYWORD_LATEX: Partial<Record<KeywordId, string>> = {
	to: '\\KwTo',
	return: '\\Return',
	and: '\\textbf{and}',
	or: '\\textbf{or}',
	not: '\\textbf{not}',
	true: '\\textbf{true}',
	false: '\\textbf{false}',
	downto: '\\textbf{downto}',
};

function escapeText(text: string): string {
	return text
		.replace(/[\\{}$&#%_^~]/g, (char) => TEXT_ESCAPES[char] ?? char)
		.replace(/“/g, '``')
		.replace(/”/g, "''")
		.replace(/‘/g, '`')
		.replace(/’/g, "'");
}

/** Inline content → LaTeX text. */
export function inlineLatex(content: Inline[]): string {
	return content
		.map((item) => {
			switch (item.kind) {
				case 'text':
					return escapeText(item.text);
				case 'space':
					return ' ';
				case 'math':
					return item.display ? `$$${item.tex}$$` : `$${item.tex}$`;
				case 'keyword':
					return KEYWORD_LATEX[item.keyword] ?? `\\textbf{${item.keyword}}`;
				case 'word':
					return item.command ? `\\${item.command}` : `\\textbf{${escapeText(item.text)}}`;
				case 'call':
					return item.command
						? `\\${item.command}{${inlineLatex(item.args)}}`
						: `\\textsc{${inlineLatex(item.name)}}(${inlineLatex(item.args)})`;
				case 'styled':
					return item.declaration
						? `{\\${item.command} ${inlineLatex(item.children)}}`
						: `\\${item.command}{${inlineLatex(item.children)}}`;
				case 'break':
					return '\\\\';
			}
		})
		.join('')
		.trim();
}

const LOOP_MACROS: Record<string, string> = { for: '\\For', forall: '\\ForAll', foreach: '\\ForEach', while: '\\While' };

/** Definitions the export adds for constructs that algorithm2e does not have built in. */
const EXTRA_DEFINITIONS: Record<string, string> = {
	Input: '\\SetKwInOut{Input}{input}',
	Output: '\\SetKwInOut{Output}{output}',
	Proc: '\\SetKwProg{Proc}{Procedure}{}{}',
	Fn: '\\SetKwProg{Fn}{Function}{}{}',
	Upon: '\\SetKwFor{Upon}{upon}{}{end}',
	Loop: '\\SetKwFor{Loop}{loop}{}{end}',
	Print: '\\SetKw{Print}{print}',
	Break: '\\SetKw{Break}{break}',
	Continue: '\\SetKw{Continue}{continue}',
};

class Writer {
	readonly lines: string[] = [];
	/** Macros used by the body that need a `\SetKw...` line (see EXTRA_DEFINITIONS). */
	readonly needs = new Set<string>();

	constructor(private readonly defined: ReadonlySet<string>) {}

	private line(depth: number, text: string): void {
		this.lines.push(`${'  '.repeat(depth)}${text}`);
	}

	private use(macro: string): string {
		if (!this.defined.has(macro)) this.needs.add(macro);
		return `\\${macro}`;
	}

	/** `\Head{arg}{` + body + `}`. */
	private wrap(depth: number, head: string, body: Node[], tail = '}'): void {
		this.line(depth, `${head}{`);
		this.nodes(body, depth + 1);
		this.line(depth, tail);
	}

	/** One-line body: statements without the trailing `\;` of the last one. */
	private inlineBody(body: Node[]): string {
		const writer = new Writer(this.defined);
		writer.nodes(body, 0);
		for (const macro of writer.needs) this.needs.add(macro);
		return writer.lines.map((line) => line.trim()).join(' ').replace(/\\;$/, '');
	}

	nodes(nodes: Node[], depth: number): void {
		const simple = (node: Node | undefined) =>
			node?.type === 'statement' || node?.type === 'return' || node?.type === 'print' || node?.type === 'command';
		nodes.forEach((node, index) => {
			// A side comment right after a statement takes the place of its `\;` (`x\tcp*{...}`).
			const next = nodes[index + 1];
			if (node.type === 'comment' && node.side && simple(nodes[index - 1])) {
				const macro = node.style === 'block' ? 'tcc' : 'tcp';
				const last = this.lines.length - 1;
				this.lines[last] = `${this.lines[last]!}\\${macro}*{${inlineLatex(node.text)}}`;
				return;
			}
			this.node(node, depth, next?.type === 'comment' && next.side && simple(node));
		});
	}

	private node(node: Node, depth: number, sideNext: boolean): void {
		const end = (text: string) => (sideNext ? text : `${text}\\;`);
		switch (node.type) {
			case 'statement':
				this.line(depth, end(`${node.numbered ? '' : '\\nonl '}${inlineLatex(node.text)}`));
				return;
			case 'return':
				this.line(depth, end(`\\Return ${inlineLatex(node.text)}`.trimEnd()));
				return;
			case 'print':
				this.line(depth, end(`${this.use('Print')} ${inlineLatex(node.text)}`.trimEnd()));
				return;
			case 'command':
				this.line(depth, end(this.use(node.command === 'break' ? 'Break' : 'Continue')));
				return;
			case 'io': {
				const macro = node.command ?? this.ioMacro(node.label);
				this.line(depth, `${macro.startsWith('\\') ? macro : this.use(macro)}{${inlineLatex(node.text)}}`);
				return;
			}
			case 'if':
				this.conditional(node, depth);
				return;
			case 'loop': {
				const cond = inlineLatex(node.cond);
				let macro: string;
				if (node.custom) macro = `\\${node.custom.command}`;
				else if (node.loop === 'loop') macro = this.use('Loop');
				else if (node.loop === 'upon') macro = this.use('Upon');
				else macro = LOOP_MACROS[node.loop] ?? '\\For';
				if (node.oneLine && !node.custom) this.line(depth, `\\l${macro.slice(1)}{${cond}}{${this.inlineBody(node.body)}}`);
				else this.wrap(depth, `${macro}{${cond}}`, node.body);
				return;
			}
			case 'repeat': {
				const macro = node.custom ? `\\${node.custom.command}` : '\\Repeat';
				const until = inlineLatex(node.until);
				if (node.oneLine && !node.custom) this.line(depth, `\\lRepeat{${until}}{${this.inlineBody(node.body)}}`);
				else this.wrap(depth, `${macro}{${until}}`, node.body);
				return;
			}
			case 'procedure': {
				if (node.custom) {
					this.wrap(depth, `\\${node.custom.command}{${inlineLatex(node.args)}}`, node.body);
					return;
				}
				const macro = this.use(node.kind === 'function' ? 'Fn' : 'Proc');
				this.wrap(depth, `${macro}{\\textsc{${inlineLatex(node.name)}}(${inlineLatex(node.args)})}`, node.body);
				return;
			}
			case 'switch':
				this.wrap(depth, `\\Switch{${inlineLatex(node.cond)}}`, node.body);
				return;
			case 'case': {
				if (node.cond === null) {
					if (node.oneLine) this.line(depth, `\\lOther{${this.inlineBody(node.body)}}`);
					else this.wrap(depth, node.end ? '\\Other' : '\\uOther', node.body);
					return;
				}
				const cond = inlineLatex(node.cond);
				if (node.oneLine) this.line(depth, `\\lCase{${cond}}{${this.inlineBody(node.body)}}`);
				else this.wrap(depth, `${node.end ? '\\Case' : '\\uCase'}{${cond}}`, node.body);
				return;
			}
			case 'block':
				this.wrap(depth, node.custom ? `\\${node.custom.command}` : '\\Begin', node.body);
				return;
			case 'comment':
				this.line(depth, `\\${node.style === 'block' ? 'tcc' : 'tcp'}{${inlineLatex(node.text)}}`);
				return;
			case 'blank':
				this.line(depth, '\\BlankLine');
				return;
		}
	}

	private ioMacro(label: Inline[]): string {
		const first = label[0];
		const keyword = first?.kind === 'keyword' ? first.keyword : null;
		// As in the course template: Require/Input → \Input, Ensure/Output → \Output.
		if (keyword === 'require' || keyword === 'input') return 'Input';
		if (keyword === 'ensure' || keyword === 'output') return 'Output';
		if (keyword === 'data') return '\\KwData';
		if (keyword === 'result') return '\\KwResult';
		return 'Input';
	}

	private conditional(node: Extract<Node, { type: 'if' }>, depth: number): void {
		const [first, ...rest] = node.branches;
		if (!first) return;
		const cond = (branch: Branch) => inlineLatex(branch.cond);
		if (node.oneLine && node.otherwise) {
			this.line(depth, `\\leIf{${cond(first)}}{${this.inlineBody(first.body)}}{${this.inlineBody(node.otherwise.body)}}`);
			return;
		}
		if (rest.length === 0 && !node.otherwise) {
			if (first.oneLine) this.line(depth, `\\lIf{${cond(first)}}{${this.inlineBody(first.body)}}`);
			else this.wrap(depth, `\\If{${cond(first)}}`, first.body);
			return;
		}
		if (rest.length === 0 && node.otherwise && !first.oneLine && !node.otherwise.oneLine) {
			this.line(depth, `\\eIf{${cond(first)}}{`);
			this.nodes(first.body, depth + 1);
			this.wrap(depth, '}', node.otherwise.body);
			return;
		}
		const part = (macro: string, branch: Branch, withCond: boolean) => {
			const head = withCond ? `${macro}{${cond(branch)}}` : macro;
			if (branch.oneLine) this.line(depth, `\\l${macro.slice(1).replace(/^u/, '')}${withCond ? `{${cond(branch)}}` : ''}{${this.inlineBody(branch.body)}}`);
			else this.wrap(depth, head, branch.body);
		};
		part('\\uIf', first, true);
		rest.forEach((branch, index) => {
			const last = index === rest.length - 1 && !node.otherwise;
			part(last ? '\\ElseIf' : '\\uElseIf', branch, true);
		});
		if (node.otherwise) part('\\Else', node.otherwise, false);
	}
}

function algorithmLatex(algorithm: Algorithm): string {
	const defined = new Set<string>();
	for (const definition of algorithm.definitions) {
		const name = /^\\\w+\s*\{\s*(\w+)\s*\}/.exec(definition)?.[1];
		if (name) defined.add(name);
	}
	const writer = new Writer(defined);
	writer.nodes(algorithm.body, 1);
	const out: string[] = [];
	// algorithm2e macros only work inside the environment; a bare block stays in place with [H].
	out.push(algorithm.float ? '\\begin{algorithm}' : '\\begin{algorithm}[H]');
	if (algorithm.caption) out.push(`\\caption{${inlineLatex(algorithm.caption)}}`);
	if (algorithm.label) out.push(`\\label{${algorithm.label}}`);
	const overrides = algorithm.overrides;
	if (overrides.scopeLines !== undefined || overrides.showEnd !== undefined) {
		if (overrides.scopeLines === false) out.push('\\SetAlgoNoLine');
		else if (overrides.scopeLines) out.push(overrides.showEnd === false ? '\\SetAlgoVlined' : '\\SetAlgoLined');
		else if (overrides.showEnd === false) out.push('\\SetAlgoNoEnd');
	}
	if (overrides.lineNumbers !== undefined) out.push(overrides.lineNumbers > 0 ? '\\LinesNumbered' : '\\LinesNotNumbered');
	if (overrides.semicolons === false) out.push('\\DontPrintSemicolon');
	for (const macro of ['Input', 'Output', 'Proc', 'Fn', 'Upon', 'Loop', 'Print', 'Break', 'Continue']) {
		if (writer.needs.has(macro)) out.push(EXTRA_DEFINITIONS[macro]!);
	}
	out.push(...algorithm.definitions);
	out.push(...writer.lines);
	out.push('\\end{algorithm}');
	return out.join('\n');
}

function preamble(options: ExportOptions): string {
	const packageOptions = [
		...(options.portuguese ? ['portuguese'] : []),
		...(options.lineNumbers ? ['linesnumbered'] : []),
		'ruled',
		options.scopeLines ? (options.showEnd ? 'lined' : 'vlined') : 'noline',
		...(options.showEnd || options.scopeLines ? [] : ['noend']),
	];
	return [
		'\\documentclass{article}',
		'\\usepackage[utf8]{inputenc}',
		'\\usepackage[T1]{fontenc}',
		...(options.portuguese ? ['\\usepackage[brazil]{babel}'] : []),
		'\\usepackage{amsmath,amssymb}',
		`\\usepackage[${packageOptions.join(',')}]{algorithm2e}`,
	].join('\n');
}

/** A block's algorithms as algorithm2e LaTeX. */
export function toAlgorithm2e(algorithms: Algorithm[], options: ExportOptions): string {
	const body = algorithms.map(algorithmLatex).join('\n\n');
	if (!options.document) return `${body}\n`;
	return `${preamble(options)}\n\n\\begin{document}\n\n${body}\n\n\\end{document}\n`;
}

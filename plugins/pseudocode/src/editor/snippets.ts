import { detectDialect } from '../syntax';

/**
 * A command offered while typing `\` in a block. In `insert`, `$|` marks the
 * cursor and each `\n` continues at the indentation of the current line.
 */
export interface Snippet {
	label: string;
	insert: string;
}

function snippet(label: string, insert = label): Snippet {
	return { label, insert };
}

/** One-line command with an argument: `\caption{|}`. */
function withArgument(name: string, args = 1): Snippet {
	return snippet(`\\${name}${'{}'.repeat(args)}`, `\\${name}{$|}${'{}'.repeat(args - 1)}`);
}

/** Opening command with its closing one on the next line (algorithmic). */
function paired(label: string, open: string, close: string): Snippet {
	return snippet(label, `${open}\n${close}`);
}

/** Command whose body goes between braces (algorithm2e). */
function bodied(name: string, args: number, bodies = 1): Snippet {
	const head = `\\${name}${args > 0 ? `{$|}${'{}'.repeat(args - 1)}` : ''}`;
	const body = '{\n  \n}'.repeat(bodies);
	return snippet(`\\${name}${'{}'.repeat(args + bodies)}`, args > 0 ? `${head}${body}` : `${head}{\n  $|\n}`);
}

const TEXT = [withArgument('textbf'), withArgument('textit'), withArgument('texttt'), withArgument('label')];

const ALGORITHMIC: Snippet[] = [
	snippet('\\begin{algorithm}', '\\begin{algorithm}\n$|\n\\end{algorithm}'),
	snippet('\\begin{algorithmic}', '\\begin{algorithmic}\n$|\n\\end{algorithmic}'),
	withArgument('caption'),
	...['Require', 'Ensure', 'Input', 'Output', 'State', 'Statex', 'Return', 'Print'].map((name) => snippet(`\\${name}`, `\\${name} $|`)),
	paired('\\If{}', '\\If{$|}', '\\EndIf'),
	withArgument('ElsIf'),
	snippet('\\Else'),
	paired('\\For{}', '\\For{$|}', '\\EndFor'),
	paired('\\ForAll{}', '\\ForAll{$|}', '\\EndFor'),
	paired('\\While{}', '\\While{$|}', '\\EndWhile'),
	paired('\\Repeat', '\\Repeat$|', '\\Until{}'),
	paired('\\Loop', '\\Loop$|', '\\EndLoop'),
	paired('\\Procedure{}{}', '\\Procedure{$|}{}', '\\EndProcedure'),
	paired('\\Function{}{}', '\\Function{$|}{}', '\\EndFunction'),
	withArgument('Call', 2),
	withArgument('Comment'),
	withArgument('Until'),
	...['Break', 'Continue', 'EndIf', 'EndFor', 'EndWhile', 'EndLoop', 'EndProcedure', 'EndFunction'].map((name) => snippet(`\\${name}`)),
	...['AND', 'OR', 'NOT', 'TRUE', 'FALSE', 'TO', 'DOWNTO'].map((name) => snippet(`\\${name}`)),
	...TEXT,
];

const ALGORITHM2E: Snippet[] = [
	snippet('\\begin{algorithm}', '\\begin{algorithm}\n$|\n\\end{algorithm}'),
	withArgument('caption'),
	...['SetAlgoLined', 'SetAlgoVlined', 'SetAlgoNoLine', 'SetAlgoNoEnd', 'DontPrintSemicolon', 'LinesNumbered', 'BlankLine'].map((name) =>
		snippet(`\\${name}`),
	),
	withArgument('SetKwInOut', 2),
	withArgument('SetKwInput', 2),
	withArgument('SetKw', 2),
	withArgument('SetKwData', 2),
	withArgument('SetKwFunction', 2),
	withArgument('SetKwProg', 4),
	...['KwIn', 'KwOut', 'KwData', 'KwResult'].map((name) => withArgument(name)),
	bodied('If', 1),
	bodied('eIf', 1, 2),
	bodied('uIf', 1),
	bodied('uElseIf', 1),
	bodied('ElseIf', 1),
	bodied('Else', 0),
	withArgument('lIf', 2),
	bodied('For', 1),
	bodied('ForEach', 1),
	bodied('ForAll', 1),
	bodied('While', 1),
	bodied('Repeat', 1),
	bodied('Switch', 1),
	bodied('Case', 1),
	bodied('Other', 0),
	bodied('Begin', 0),
	snippet('\\Return', '\\Return $|\\;'),
	snippet('\\KwRet', '\\KwRet $|\\;'),
	snippet('\\KwTo'),
	withArgument('tcp'),
	snippet('\\tcp*{}', '\\tcp*{$|}'),
	withArgument('tcc'),
	...TEXT,
];

const DEFINITION = /\\(SetKwInOut|SetKwInput|SetKwData|SetKwFunction|SetKw|SetKwProg|SetKwFor|SetKwBlock|SetKwRepeat)\s*\{\s*(\w+)\s*\}/g;

/** Commands defined in the block itself (`\SetKwInOut{Input}{input}` → `\Input{}`). */
function defined(source: string): Snippet[] {
	const found: Snippet[] = [];
	for (const match of source.matchAll(DEFINITION)) {
		const [, kind = '', name = ''] = match;
		if (kind === 'SetKw' || kind === 'SetKwData') found.push(snippet(`\\${name}`));
		else if (kind === 'SetKwProg' || kind === 'SetKwFor' || kind === 'SetKwRepeat') found.push(bodied(name, 1));
		else if (kind === 'SetKwBlock') found.push(bodied(name, 0));
		else found.push(withArgument(name));
	}
	return found;
}

/**
 * Commands for a block: those of its dialect, plus the ones it defines. A block
 * that does not show its dialect yet (still empty) gets both lists.
 */
export function snippetsFor(source: string): Snippet[] {
	const decided = /\\begin\s*\{\s*algorithmic\s*\}|\\;|\\SetKw|\\SetAlgo|\\Kw[A-Z]|\\tc[pc]/.test(source);
	let list: Snippet[];
	if (!decided) list = [...ALGORITHMIC, ...ALGORITHM2E];
	else list = detectDialect(source) === 'algorithmic' ? ALGORITHMIC : [...defined(source), ...ALGORITHM2E];
	const seen = new Set<string>();
	return list.filter((item) => !seen.has(item.label) && seen.add(item.label));
}

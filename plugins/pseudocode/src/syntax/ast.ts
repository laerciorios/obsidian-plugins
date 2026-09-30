/**
 * The tree both dialects parse into. The renderer and the LaTeX export only see
 * this tree, so an algorithm looks and exports the same whichever syntax it was
 * written in. Nothing here depends on Obsidian.
 */

export type Dialect = 'algorithmic' | 'algorithm2e';

/** Built-in words, translated at render time by the keyword table. */
export type KeywordId =
	| 'algorithm'
	| 'if'
	| 'then'
	| 'elseif'
	| 'else'
	| 'endif'
	| 'for'
	| 'forall'
	| 'foreach'
	| 'do'
	| 'endfor'
	| 'while'
	| 'endwhile'
	| 'loop'
	| 'endloop'
	| 'repeat'
	| 'until'
	| 'procedure'
	| 'endprocedure'
	| 'function'
	| 'endfunction'
	| 'upon'
	| 'endupon'
	| 'switch'
	| 'case'
	| 'otherwise'
	| 'begin'
	| 'end'
	| 'return'
	| 'print'
	| 'break'
	| 'continue'
	| 'require'
	| 'ensure'
	| 'input'
	| 'output'
	| 'data'
	| 'result'
	| 'and'
	| 'or'
	| 'not'
	| 'true'
	| 'false'
	| 'to'
	| 'downto';

/** How a word defined in the block (algorithm2e `\SetKw...`) is typeset. */
export type WordStyle = 'keyword' | 'function' | 'data';

export type Inline =
	| { kind: 'text'; text: string }
	| { kind: 'space' }
	| { kind: 'math'; tex: string; display: boolean }
	| { kind: 'keyword'; keyword: KeywordId }
	/** A word written in the block (never translated); `command` is the macro that produced it, for export. */
	| { kind: 'word'; text: string; style: WordStyle; command?: string }
	/** `\Call{Name}{args}` or an algorithm2e `\SetKwFunction` macro. */
	| { kind: 'call'; name: Inline[]; args: Inline[]; command?: string }
	/** Font or size command: `\textbf{...}` (declaration false) or `\bfseries ...` (declaration true). */
	| { kind: 'styled'; command: string; declaration: boolean; children: Inline[] }
	| { kind: 'break' };

export interface Branch {
	cond: Inline[];
	body: Node[];
	/** algorithm2e `\lIf`, `\lElse`...: the body goes on the header line. */
	oneLine: boolean;
}

/** Words of a construct defined in the block (`\SetKwFor`, `\SetKwProg`...). */
export interface CustomWords {
	/** The macro name, without backslash (`Fn`), used by the export. */
	command: string;
	head: string;
	/** `do` of `\SetKwFor`, the text after the header of `\SetKwProg`. */
	middle: string;
	/** Closing word (`end`, `until`...); empty means no closing line. */
	end: string;
}

export type Node =
	| { type: 'statement'; text: Inline[]; numbered: boolean; semicolon: boolean }
	| { type: 'return' | 'print'; text: Inline[] }
	| { type: 'command'; command: 'break' | 'continue' }
	/** `\Require`, `\Input`, `\KwIn`... or an input defined with `\SetKwInOut`. */
	| { type: 'io'; label: Inline[]; text: Inline[]; command?: string }
	| { type: 'if'; branches: Branch[]; otherwise: Branch | null; end: boolean; oneLine: boolean }
	| {
			type: 'loop';
			loop: 'for' | 'forall' | 'foreach' | 'while' | 'loop' | 'upon' | 'custom';
			cond: Inline[];
			body: Node[];
			oneLine: boolean;
			custom?: CustomWords;
	  }
	| { type: 'repeat'; body: Node[]; until: Inline[]; oneLine: boolean; custom?: CustomWords }
	| {
			type: 'procedure';
			kind: 'procedure' | 'function' | 'custom';
			/** Name in small caps (algorithmic) or, for `\SetKwProg`, empty. */
			name: Inline[];
			/** Arguments (algorithmic) or the whole header (`\SetKwProg`). */
			args: Inline[];
			body: Node[];
			custom?: CustomWords;
	  }
	| { type: 'switch'; cond: Inline[]; body: Node[] }
	| { type: 'case'; cond: Inline[] | null; body: Node[]; end: boolean; oneLine: boolean }
	| { type: 'block'; body: Node[]; custom?: CustomWords }
	/** `side`: right-aligned on the current line (`\Comment`, `\tcp*`); otherwise a line of its own (`\tcp`). */
	| { type: 'comment'; text: Inline[]; side: boolean; style: 'line' | 'block' }
	| { type: 'blank' };

/** Style set by the block itself, over the plugin settings. */
export interface Overrides {
	/** 0 turns numbering off; n numbers every n-th line. */
	lineNumbers?: number;
	scopeLines?: boolean;
	showEnd?: boolean;
	/** "end if" (true) or "end" (false). */
	longEnd?: boolean;
	/** Print the `;` of algorithm2e statements. */
	semicolons?: boolean;
}

export interface Algorithm {
	dialect: Dialect;
	/** Inside `\begin{algorithm}`: drawn with rules, may have a caption. */
	float: boolean;
	caption: Inline[] | null;
	label: string | null;
	body: Node[];
	overrides: Overrides;
	/** algorithm2e `\SetKw...` definitions, verbatim, for the export. */
	definitions: string[];
}

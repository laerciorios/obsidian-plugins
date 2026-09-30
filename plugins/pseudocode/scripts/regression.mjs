// Regression test against pseudocode.js, the library behind the community Pseudocode
// plugin: every ```pseudo block of a vault is rendered by both and compared line by
// line (indentation, line number, keywords, text and math as TeX).
//
//   pnpm --filter pseudocode regression [vault] [--verbose]     (default: the dev-vault)
//
// Only reads the notes. algorithm2e blocks (which pseudocode.js cannot read) are only
// checked to parse. Intentional differences are normalized before comparing:
//   - the caption number: this plugin numbers algorithms per note;
//   - spacing inside comments ("//x" vs "// x");
//   - quotes: this plugin typesets ``x'' as “x” like LaTeX (pseudocode.js gives ‘‘x'');
//   - a comment before the first line: pseudocode.js floats it over that line, this
//     plugin attaches it to the line (same look);
//   - `\State \Return x`: pseudocode.js makes an empty line and then "return x"; this
//     plugin makes one line, as algorithmicx does.
// Exit code 1 when a block renders differently, or when this plugin rejects a block
// that pseudocode.js renders. Blocks both reject (or algorithm2e blocks with an
// error) are listed as invalid.

import esbuild from 'esbuild';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const pluginDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const vault = resolve(args.find((arg) => !arg.startsWith('--')) ?? join(pluginDir, '../../dev-vault'));

// 1. This plugin's parser and layout, bundled for Node (they do not depend on Obsidian).
const bundle = join(tmpdir(), `pseudocode-regression-${process.pid}.mjs`);
await esbuild.build({
	stdin: {
		contents: `export { parse, detectDialect } from './src/syntax'; export { layout } from './src/render/lines'; export { KEYWORDS } from './src/render/keywords';`,
		resolveDir: pluginDir,
		loader: 'ts',
	},
	bundle: true,
	format: 'esm',
	platform: 'node',
	outfile: bundle,
	logLevel: 'warning',
});
const core = await import(pathToFileURL(bundle).href);
rmSync(bundle, { force: true });

// 2. pseudocode.js, with math left as TeX instead of KaTeX HTML.
const escapeHtml = (text) => text.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
globalThis.katex = {
	renderToString: (tex, options) => `<span class="m">${escapeHtml(options?.displayMode ? `$$${tex}$$` : `$${tex}$`)}</span>`,
};
const pseudocode = createRequire(import.meta.url)('pseudocode');

// 3. The blocks of the vault.
function markdownFiles(dir) {
	const files = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
		const path = join(dir, entry.name);
		if (entry.isDirectory()) files.push(...markdownFiles(path));
		else if (entry.name.endsWith('.md')) files.push(path);
	}
	return files;
}

function pseudoBlocks(text) {
	const lines = text.split('\n');
	const blocks = [];
	for (let i = 0; i < lines.length; i++) {
		const open = /^[ \t]{0,3}(`{3,}|~{3,})[ \t]*([^`\s]*)/.exec(lines[i]);
		if (!open) continue;
		const close = new RegExp(`^[ \\t]{0,3}${open[1][0] === '`' ? '`' : '~'}{${open[1].length},}[ \\t]*$`);
		let end = i + 1;
		while (end < lines.length && !close.test(lines[end])) end++;
		if (open[2].toLowerCase() === 'pseudo') blocks.push({ line: i + 1, source: lines.slice(i + 1, end).join('\n') });
		i = end;
	}
	return blocks;
}

// 4. Both renderings as comparable lines.
const collapse = (text) => text.replace(/\s+/g, ' ').replace(/[“”]/g, "''").replace(/[‘’`]/g, "'").trim();
const withoutCaptionNumber = (text) => text.replace(/^Algorithm \d+ /, 'Algorithm ');

function plain(items) {
	return items
		.map((item) => {
			switch (item.kind) {
				case 'text':
				case 'word':
					return item.text;
				case 'space':
					return ' ';
				case 'math':
					return item.display ? `$$${item.tex}$$` : `$${item.tex}$`;
				case 'call':
					return `${plain(item.name)}(${plain(item.args)})`;
				case 'styled':
					return plain(item.children);
				case 'break':
					return '\\\\';
				default:
					return `[${item.kind}]`;
			}
		})
		.join('');
}

const style = { lineNumbers: true, scopeLines: false, showEnd: true, commentDelimiter: '//', keywords: core.KEYWORDS.en };

function ours(source) {
	const out = [];
	for (const algorithm of core.parse(source)) {
		const result = core.layout(algorithm, style, algorithm.caption ? 1 : null);
		if (result.caption) out.push(`caption | ${withoutCaptionNumber(collapse(plain(result.caption)))}`);
		for (const line of result.lines) {
			const comment = line.comment ? ` | ${plain(line.comment).replace(/\s+/g, '')}` : '';
			if (line.kind === 'io') out.push(`io | ${collapse(plain(line.content))}`);
			else out.push(`${line.depth} | ${line.number ?? ''} | ${collapse(plain(line.content))}${comment}`);
		}
	}
	return out;
}

const decode = (text) =>
	text.replace(/&(amp|lt|gt|quot|#39|#x2F);/g, (_, name) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x2F': '/' })[name]);

function reference(source) {
	const html = pseudocode.renderToString(source, { lineNumber: true, captionCount: 0, commentDelimiter: '//', noEnd: false });
	const out = [];
	const stack = [];
	let depth = 0;
	let inAlgorithmic = false;
	let line = null;
	// A comment outside any line (before the first one) floats over the next line.
	let pending = null;
	for (const match of html.matchAll(/<(\/?)(\w+)([^>]*)>|([^<]+)/g)) {
		const [, closing, tag, attrs, text] = match;
		if (text !== undefined) {
			if (line) line[line.mode] += decode(text);
			else if (pending !== null) pending += decode(text);
			continue;
		}
		if (tag === 'br') {
			if (line) line[line.mode] += '\\\\';
			continue;
		}
		const cls = /class="([^"]*)"/.exec(attrs)?.[1] ?? '';
		if (!closing) {
			stack.push({ tag, cls });
			if (tag === 'div' && /\bps-block\b/.test(cls)) depth++;
			if (tag === 'div' && /\bps-algorithmic\b/.test(cls)) inAlgorithmic = true;
			if (tag === 'p' && /\bps-line\b/.test(cls)) {
				line = { depth, number: '', text: '', comment: pending ?? '', mode: 'text', caption: !inAlgorithmic };
				pending = null;
			}
			if (tag === 'span' && !line && /\bps-comment\b/.test(cls)) pending = '';
			if (tag === 'span' && line && /\bps-linenum\b/.test(cls)) line.mode = 'number';
			if (tag === 'span' && line && /\bps-comment\b/.test(cls)) line.mode = 'comment';
			continue;
		}
		const open = stack.pop();
		if (open.tag === 'div' && /\bps-block\b/.test(open.cls)) depth--;
		if (open.tag === 'div' && /\bps-algorithmic\b/.test(open.cls)) inAlgorithmic = false;
		if (open.tag === 'span' && line && /\bps-(linenum|comment)\b/.test(open.cls)) line.mode = 'text';
		if (open.tag === 'p' && line) {
			const comment = line.comment ? ` | ${line.comment.replace(/\s+/g, '')}` : '';
			if (line.caption) out.push(`caption | ${withoutCaptionNumber(collapse(line.text))}`);
			else if (line.depth === 0) out.push(`io | ${collapse(line.text)}`);
			else out.push(`${line.depth - 1} | ${line.number.replace(/\D/g, '')} | ${collapse(line.text)}${comment}`);
			line = null;
		}
	}
	return mergeStateReturn(out);
}

/** Drop the empty line pseudocode.js makes for `\State \Return` and renumber the rest. */
function mergeStateReturn(lines) {
	const out = [];
	let shift = 0;
	for (let i = 0; i < lines.length; i++) {
		const [depth, number, text] = lines[i].split(' | ');
		const next = lines[i + 1]?.split(' | ');
		if (text === '' && lines[i].split(' | ').length === 3 && next && next[0] === depth && /^(return|print)\b/.test(next[2] ?? '')) {
			shift++;
			continue;
		}
		if (shift > 0 && /^\d+$/.test(depth) && /^\d+$/.test(number)) {
			const parts = lines[i].split(' | ');
			parts[1] = String(Number(number) - shift);
			out.push(parts.join(' | '));
		} else out.push(lines[i]);
	}
	return out;
}

// 5. Compare.
let total = 0;
let same = 0;
let onlyParsed = 0;
const failures = [];
const invalid = [];
for (const file of markdownFiles(vault)) {
	for (const block of pseudoBlocks(readFileSync(file, 'utf8'))) {
		total++;
		const where = `${relative(vault, file)}:${block.line}`;
		const algorithm2e = core.detectDialect(block.source) === 'algorithm2e';
		let mine = null;
		let mineError = null;
		try {
			mine = ours(block.source);
		} catch (error) {
			mineError = error.message;
		}
		let theirs = null;
		let theirsError = algorithm2e ? 'algorithm2e' : null;
		if (!algorithm2e) {
			try {
				theirs = reference(block.source);
			} catch (error) {
				theirsError = error.message.split('\n')[0];
			}
		}
		if (mineError && theirsError) {
			invalid.push(`${where}: ${mineError}`);
			continue;
		}
		if (mineError) {
			failures.push({ where, detail: [`this plugin: ${mineError}`] });
			continue;
		}
		if (theirsError) {
			// algorithm2e, or something pseudocode.js rejects (e.g. \begin{algorithmic}[1]).
			onlyParsed++;
			if (verbose) console.log(`· ${where}: only this plugin reads it (${theirsError})`);
			continue;
		}
		const detail = [];
		for (let i = 0; i < Math.max(mine.length, theirs.length); i++) {
			if (mine[i] !== theirs[i]) detail.push(`line ${i + 1}:\n    pseudocode.js: ${theirs[i] ?? '(none)'}\n    this plugin:   ${mine[i] ?? '(none)'}`);
		}
		if (detail.length === 0) same++;
		else failures.push({ where, detail });
		if (verbose && detail.length === 0) console.log(`✔ ${where}`);
	}
}

for (const failure of failures) {
	console.log(`✖ ${failure.where}`);
	for (const line of failure.detail.slice(0, 5)) console.log(`  ${line}`);
}
for (const line of invalid) console.log(`! invalid block ${line}`);
console.log(
	`\n${total} blocks in ${vault}: ${same} identical to pseudocode.js, ${onlyParsed} only readable by this plugin (algorithm2e or extensions), ${invalid.length} invalid, ${failures.length} different.`,
);
process.exit(failures.length > 0 ? 1 : 0);

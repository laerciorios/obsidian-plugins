import type { Editor } from 'obsidian';
import { scanNote } from '../render/numbering';
import type { NoteBlock } from '../render/numbering';

/** The `pseudo` block around the line, with its source; `fences` also accepts the fence lines. */
export function blockAt(editor: Editor, line: number, fences = false): { block: NoteBlock; source: string } | null {
	const inside = (block: NoteBlock) =>
		fences ? block.lineStart <= line && line <= block.lineEnd : block.lineStart < line && line < block.lineEnd;
	const block = scanNote(editor.getValue()).find(inside);
	if (!block) return null;
	const lines: string[] = [];
	for (let index = block.lineStart + 1; index < block.lineEnd; index++) lines.push(editor.getLine(index));
	return { block, source: lines.join('\n') };
}

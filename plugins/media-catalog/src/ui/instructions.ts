import { Platform } from 'obsidian';

export interface Instruction {
	command: string;
	purpose: string;
}

/** Keyboard hints at the bottom of a step, in Obsidian's own prompt markup. Skipped on mobile. */
export function renderInstructions(parent: HTMLElement, items: readonly Instruction[]): void {
	if (Platform.isMobile) return;
	const el = parent.createDiv({ cls: 'prompt-instructions' });
	for (const item of items) {
		const row = el.createDiv({ cls: 'prompt-instruction' });
		row.createSpan({ cls: 'prompt-instruction-command', text: item.command });
		row.createSpan({ text: item.purpose });
	}
}

/** Label of the Mod+Enter shortcut for this platform. */
export function modEnterLabel(): string {
	return Platform.isMacOS ? '⌘ ↵' : 'Ctrl ↵';
}

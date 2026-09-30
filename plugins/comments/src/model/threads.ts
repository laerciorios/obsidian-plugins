import type { LocateRequest } from '../anchor/locate';
import { AI_AUTHORS } from '../constants';
import type { Thread } from './format';

/** What to find in the note for a thread: its anchor and every passage it quotes. */
export function locateRequest(thread: Thread): LocateRequest {
	return { anchor: thread.anchor, quotes: [thread.quote, ...thread.messages.map((message) => message.quote)] };
}

export function isAiAuthor(author: string): boolean {
	return AI_AUTHORS.includes(author.trim().toLowerCase());
}

export function openThreads(threads: readonly Thread[]): Thread[] {
	return threads.filter((thread) => thread.status === 'open');
}

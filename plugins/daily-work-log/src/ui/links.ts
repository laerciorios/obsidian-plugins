import { Keymap } from 'obsidian';
import type { App, Component } from 'obsidian';
import { HOVER_SOURCE } from '../constants';

/**
 * A link to a note inside a rendered block: opens on click (new tab with the
 * modifier or the middle button) and shows the page preview on hover. The
 * listeners live on the element, so they go away with it on the next redraw.
 */
export function noteLink(
	app: App,
	component: Component,
	parent: HTMLElement,
	options: { text: string; path: string; sourcePath: string; cls?: string },
): HTMLAnchorElement {
	const { text, path, sourcePath } = options;
	const link = parent.createEl('a', {
		cls: ['internal-link', ...(options.cls ? [options.cls] : [])],
		text,
		href: path,
		attr: { 'data-href': path },
	});
	const open = (evt: MouseEvent) => {
		evt.preventDefault();
		// The reading view handles internal links itself: only one of us opens it.
		evt.stopPropagation();
		void app.workspace.openLinkText(path, sourcePath, evt.button === 1 || Keymap.isModEvent(evt));
	};
	link.addEventListener('click', open);
	link.addEventListener('auxclick', (evt) => {
		if (evt.button === 1) open(evt);
	});
	link.addEventListener('mouseover', (evt) => {
		app.workspace.trigger('hover-link', {
			event: evt,
			source: HOVER_SOURCE,
			hoverParent: component,
			targetEl: link,
			linktext: path,
			sourcePath,
		});
	});
	return link;
}

import { NodeRef } from './refs';
import { call, rawLinks, rawNodes, requestFrame } from './raw';
import type { Bag, GraphRenderer } from './raw';

function selected(item: Bag, paths: ReadonlySet<string> | null): boolean {
	return !paths || (typeof item.id === 'string' && paths.has(item.id));
}

/**
 * Re-read the text of nodes already drawn (all, or those with the given paths) through the
 * current `getDisplayText`, patched or not. `getDisplayText` is only called when a node is
 * created, and `setData` reuses nodes, so a changed frontmatter needs this.
 */
export function refreshNodeLabels(renderer: GraphRenderer, paths: ReadonlySet<string> | null): void {
	let changed = false;
	for (const node of rawNodes(renderer)) {
		if (!selected(node, paths) || !node.text || typeof node.text !== 'object') continue;
		const text = node.text as Bag;
		const next = call(node, 'getDisplayText');
		if (typeof next === 'string' && text.text !== next) {
			text.text = next;
			changed = true;
		}
	}
	if (changed) requestFrame(renderer);
}

/** Destroy the graphics of nodes (all, or those with the given paths); the render loop recreates them. */
export function rebuildNodes(renderer: GraphRenderer, paths: ReadonlySet<string> | null): void {
	for (const node of rawNodes(renderer)) if (selected(node, paths) && node.rendered === true) call(node, 'clearGraphics');
	requestFrame(renderer);
}

/** Destroy the graphics of links (all, or those touching the given paths); the render loop recreates them. */
export function rebuildLinks(renderer: GraphRenderer, paths: ReadonlySet<string> | null): void {
	for (const link of rawLinks(renderer)) {
		if (link.rendered !== true) continue;
		const source = link.source as Bag | undefined;
		const target = link.target as Bag | undefined;
		if (paths && !(source && selected(source, paths)) && !(target && selected(target, paths))) continue;
		call(link, 'clearGraphics');
	}
	requestFrame(renderer);
}

/** Node sizes changed: text styles follow on the next frame. */
export function refreshNodeSizes(renderer: GraphRenderer, paths: ReadonlySet<string> | null): void {
	for (const node of rawNodes(renderer)) if (selected(node, paths)) NodeRef.of(node).markFontDirty();
	requestFrame(renderer);
}

/** Every node of a renderer, as refs. */
export function nodesOf(renderer: GraphRenderer): NodeRef[] {
	return rawNodes(renderer).map((node) => NodeRef.of(node));
}

export { requestFrame };

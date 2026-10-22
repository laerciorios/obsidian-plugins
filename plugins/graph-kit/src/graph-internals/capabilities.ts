import { bag, rawLinks, rawNodes, rawOf } from './raw';
import type { Bag } from './raw';
import { engineOptions, pixi } from './views';
import type { OpenGraph } from './views';

/** Internals a feature may need. */
export type Capability = 'nodeText' | 'nodeGraphics' | 'nodeSize' | 'linkGraphics' | 'engineOptions' | 'pixi';

export type CapabilityCheck = { status: 'ok' } | { status: 'pending' } | { status: 'missing'; reason: string };

const OK: CapabilityCheck = { status: 'ok' };
const PENDING: CapabilityCheck = { status: 'pending' };

function missing(reason: string): CapabilityCheck {
	return { status: 'missing', reason };
}

function methods(target: Bag, owner: string, names: string[]): CapabilityCheck {
	for (const name of names) if (typeof target[name] !== 'function') return missing(`${owner}.${name}()`);
	return OK;
}

/** Check a capability on a live graph; "pending" until it has the nodes or links to look at. */
export function checkCapability(capability: Capability, graph: OpenGraph): CapabilityCheck {
	const renderer = rawOf(graph.renderer);
	const node = rawNodes(graph.renderer)[0];
	switch (capability) {
		case 'nodeText': {
			if (!node) return PENDING;
			if (typeof node.id !== 'string' || typeof node.type !== 'string') return missing('node.id/node.type');
			if (!('text' in node)) return missing('node.text');
			const text = bag(node.text);
			if (text && typeof text.text !== 'string') return missing('node.text.text');
			return methods(node, 'node', ['getDisplayText', 'initGraphics', 'clearGraphics']);
		}
		case 'nodeGraphics': {
			if (!node) return PENDING;
			const checked = methods(node, 'node', ['initGraphics', 'render', 'clearGraphics', 'getSize']);
			if (checked.status !== 'ok') return checked;
			if (typeof renderer.getHighlightNode !== 'function') return missing('renderer.getHighlightNode()');
			if (typeof bag(renderer.hanger)?.addChild !== 'function') return missing('renderer.hanger');
			if (typeof renderer.nodeScale !== 'number') return missing('renderer.nodeScale');
			const drawn = rawNodes(graph.renderer).find((item) => item.rendered === true);
			if (!drawn) return PENDING;
			const circle = bag(drawn.circle);
			if (!circle || typeof circle.clear !== 'function' || typeof circle.drawPolygon !== 'function') return missing('node.circle');
			return OK;
		}
		case 'nodeSize': {
			if (!node) return PENDING;
			if (typeof node.getSize !== 'function') return missing('node.getSize()');
			if (typeof renderer.fNodeSizeMult !== 'number') return missing('renderer.fNodeSizeMult');
			if (!('fontDirty' in node) || !('weight' in node)) return missing('node.fontDirty/node.weight');
			return OK;
		}
		case 'linkGraphics': {
			const link = rawLinks(graph.renderer)[0];
			if (!link) return PENDING;
			const checked = methods(link, 'link', ['initGraphics', 'render', 'clearGraphics']);
			if (checked.status !== 'ok') return checked;
			if (!bag(link.source) || !bag(link.target)) return missing('link.source/link.target');
			const drawn = rawLinks(graph.renderer).find((item) => item.rendered === true);
			if (!drawn) return PENDING;
			const line = bag(drawn.line);
			if (!line || typeof line.tint !== 'number' || typeof line.alpha !== 'number') return missing('link.line');
			if (typeof bag(drawn.px)?.addChild !== 'function') return missing('link.px');
			return OK;
		}
		case 'engineOptions':
			return engineOptions(graph) ? OK : missing('engine.getOptions()');
		case 'pixi':
			return pixi() ? OK : missing('window.PIXI');
	}
}

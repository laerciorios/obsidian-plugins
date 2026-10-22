/**
 * The ONLY place that knows the graph view's internals (no public API). Investigated on
 * Obsidian 1.14.4 (PIXI 7.2.4); see the spec in the vault. Every field and method is checked
 * before use; a missing one turns off only the features that need it.
 *
 * - Views `graph` and `localgraph` both have `view.renderer`, and both renderers share the
 *   same renderer, node and link classes, so a patch on a prototype reaches both graphs.
 * - Prototypes are only reachable from instances (`renderer.nodes[0]`, `renderer.links[0]`).
 * - `node.getDisplayText()` is called once, in `initGraphics()`; `setData()` reuses nodes.
 * - The render loop creates up to 50 node graphics per frame (nearest to the center first),
 *   then the links whose two nodes are drawn, then calls `render()` on every node and link.
 * - `renderer.changed()` asks for frames; the loop stops after 60 idle frames.
 */
export type { GraphRenderer } from './raw';
export { LinkRef, NodeRef, lineSizeMultiplier, nodeScale, nodeSizeMultiplier, rendererScale, themeColor } from './refs';
export { checkCapability } from './capabilities';
export type { Capability, CapabilityCheck } from './capabilities';
export { installHook, patchTarget } from './patches';
export type { GraphHooks, HookName } from './patches';
export { nodesOf, rebuildLinks, rebuildNodes, refreshNodeLabels, refreshNodeSizes, requestFrame } from './redraw';
export { engineOptions, isGraphPluginEnabled, openGraphs, pixi, setEngineOptions } from './views';
export type { OpenGraph } from './views';

import assert from 'node:assert/strict';

/** Test helper: what JSON Schema cannot check — unique ids and edges pointing at nodes. */
export function checkReferences(data: unknown): void {
	const canvas = data as { nodes?: { id: string }[]; edges?: { id: string; fromNode: string; toNode: string }[] };
	const ids = new Set<string>();
	for (const item of [...(canvas.nodes ?? []), ...(canvas.edges ?? [])]) {
		assert.ok(!ids.has(item.id), `duplicate id ${item.id}`);
		ids.add(item.id);
	}
	const nodes = new Set((canvas.nodes ?? []).map((node) => node.id));
	for (const edge of canvas.edges ?? []) {
		assert.ok(nodes.has(edge.fromNode) && nodes.has(edge.toNode), `edge ${edge.id} points at missing nodes`);
	}
}
